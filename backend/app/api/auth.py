from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.config import settings
from app.core.database import get_db
from app.core.security import get_password_hash, verify_password, create_access_token
from app.models.user import User
from app.schemas.auth import UserRegister, UserLogin, Token, UserResponse
from app.api.deps import get_current_user

router = APIRouter(prefix="/api/auth", tags=["Authentication"])

@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def register(payload: UserRegister, db: Session = Depends(get_db)):
    existing_user = db.query(User).filter(User.email == payload.email.lower().strip()).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A user with this email address already exists."
        )
    
    hashed_password = get_password_hash(payload.password)
    user = User(
        email=payload.email.lower().strip(),
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
        name=user.name,
        organization=user.organization,
        role=user.role,
        token_expires_at=expires_at_ms
    )

@router.get("/me", response_model=UserResponse)
def get_current_user_profile(current_user: User = Depends(get_current_user)):
    return current_user
