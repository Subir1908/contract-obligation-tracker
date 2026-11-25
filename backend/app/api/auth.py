import re
import secrets
from datetime import datetime, timezone, timedelta
from typing import Dict, Optional, Tuple
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.config import settings
from app.core.database import get_db
from app.core.security import get_password_hash, verify_password, create_access_token
from app.models.user import User
from app.schemas.auth import (
    UserRegister,
    UserLogin,
    Token,
    UserResponse,
    ForgotPasswordOtpRequest,
    ForgotPasswordVerifyOtpRequest,
    ForgotPasswordResetRequest,
)
from app.api.deps import get_current_user

router = APIRouter(prefix="/api/auth", tags=["Authentication"])

# In-memory OTP store: normalized_identifier -> (otp_code, expires_at_utc, user_id)
_OTP_STORE: Dict[str, Tuple[str, datetime, int]] = {}
OTP_TTL_SECONDS = 600  # 10 minutes


def _normalize_phone(raw: str) -> str:
    return re.sub(r"[\s\-\(\)]", "", raw.strip())


def _find_user_by_identifier(db: Session, identifier: str) -> Tuple[Optional[User], str, str]:
    cleaned = identifier.strip()
    if "@" in cleaned:
        email_clean = cleaned.lower()
        user = db.query(User).filter(User.email == email_clean).first()
        return user, "email", email_clean
    phone_norm = _normalize_phone(cleaned)
    users = db.query(User).filter(User.phone.isnot(None)).all()
    for u in users:
        if u.phone and _normalize_phone(u.phone) == phone_norm:
            return u, "phone", phone_norm
    return None, "phone", phone_norm


def _mask_target(channel: str, value: str) -> str:
    if channel == "email" and "@" in value:
        local, domain = value.split("@", 1)
        prefix = local[:2] if len(local) > 2 else local[:1]
        return f"{prefix}***@{domain}"
    if len(value) > 4:
        return f"{'*' * (len(value) - 4)}{value[-4:]}"
    return "****"


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def register(payload: UserRegister, db: Session = Depends(get_db)):
    existing_user = db.query(User).filter(User.email == payload.email.lower().strip()).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A user with this email address already exists."
        )

    phone_clean = _normalize_phone(payload.phone) if payload.phone and payload.phone.strip() else None

    hashed_password = get_password_hash(payload.password)
    user = User(
        email=payload.email.lower().strip(),
        phone=phone_clean,
        password_hash=hashed_password,
        name=payload.name or "User",
        organization=payload.organization or "Tezpur University Legal Cell",
        role=payload.role or "ADMIN_LEGAL_OFFICER"
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@router.post("/login", response_model=Token)
def login(payload: UserLogin, db: Session = Depends(get_db)):
    email_clean = payload.email.lower().strip()
    user = db.query(User).filter(User.email == email_clean).first()

    # Auto-seed demo accounts if user doesn't exist yet but matches demo email
    if not user and email_clean in [
        "mihir.csm25008@tezpur.ac.in",
        "subir.csm25011@tezpur.ac.in",
        "bishwas.csm25052@tezpur.ac.in",
        "evaluator@tezpur.ac.in"
    ]:
        org = "CSMC502 Software Engineering Lab" if "evaluator" in email_clean else "Tezpur University Legal Cell"
        role = "ACADEMIC_EVALUATOR" if "evaluator" in email_clean else "ADMIN_LEGAL_OFFICER"
        user = User(
            email=email_clean,
            password_hash=get_password_hash("admin123"),
            name=email_clean.split("@")[0].capitalize(),
            organization=org,
            role=role
        )
        db.add(user)
        db.commit()
        db.refresh(user)

    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    expire_delta = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(subject=user.user_id, expires_delta=expire_delta)
    expires_at_ms = int((datetime.now(timezone.utc) + expire_delta).timestamp() * 1000)

    return Token(
        access_token=access_token,
        token_type="bearer",
        user_id=f"usr-{user.user_id}",
        email=user.email,
        phone=user.phone,
        name=user.name,
        organization=user.organization,
        role=user.role,
        token_expires_at=expires_at_ms
    )


@router.post("/forgot-password/request-otp")
def request_password_reset_otp(payload: ForgotPasswordOtpRequest, db: Session = Depends(get_db)):
    user, channel, norm_key = _find_user_by_identifier(db, payload.identifier)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No account found with that email address or phone number."
        )

    otp_code = f"{secrets.randbelow(900000) + 100000}"
    expires_at = datetime.now(timezone.utc) + timedelta(seconds=OTP_TTL_SECONDS)
    _OTP_STORE[norm_key] = (otp_code, expires_at, user.user_id)

    masked = _mask_target(channel, norm_key)
    print(f"[OTP] Password reset code for {channel}={norm_key}: {otp_code}")

    return {
        "status": "sent",
        "channel": channel,
        "maskedTarget": masked,
        "expiresInSeconds": OTP_TTL_SECONDS,
        "demoOtp": otp_code,
        "message": f"A 6-digit OTP has been sent to {masked}."
    }


@router.post("/forgot-password/verify-otp")
def verify_password_reset_otp(payload: ForgotPasswordVerifyOtpRequest, db: Session = Depends(get_db)):
    user, _, norm_key = _find_user_by_identifier(db, payload.identifier)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No account found with that email address or phone number."
        )

    record = _OTP_STORE.get(norm_key)
    if not record:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No active OTP found. Please request a new OTP."
        )

    stored_otp, expires_at, stored_uid = record
    if datetime.now(timezone.utc) > expires_at:
        _OTP_STORE.pop(norm_key, None)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="OTP has expired. Please request a new one."
        )

    if payload.otp.strip() != stored_otp or stored_uid != user.user_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid OTP code. Please check and try again."
        )

    return {
        "status": "verified",
        "message": "OTP verified successfully. Please enter your new password."
    }


@router.post("/forgot-password/reset")
def reset_password_with_otp(payload: ForgotPasswordResetRequest, db: Session = Depends(get_db)):
    user, _, norm_key = _find_user_by_identifier(db, payload.identifier)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No account found with that email address or phone number."
        )

    record = _OTP_STORE.get(norm_key)
    if not record:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No active OTP found. Please request a new OTP."
        )

    stored_otp, expires_at, stored_uid = record
    if datetime.now(timezone.utc) > expires_at:
        _OTP_STORE.pop(norm_key, None)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="OTP has expired. Please request a new one."
        )

    if payload.otp.strip() != stored_otp or stored_uid != user.user_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid OTP code. Please check and try again."
        )

    user.password_hash = get_password_hash(payload.new_password)
    db.commit()
    _OTP_STORE.pop(norm_key, None)

    return {
        "status": "success",
        "message": "Your password has been reset. You can now sign in with your new password."
    }


@router.get("/me", response_model=UserResponse)
def get_current_user_profile(current_user: User = Depends(get_current_user)):
    return current_user
