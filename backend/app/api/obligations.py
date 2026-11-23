from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.models.contract import Contract
from app.models.obligation import Obligation
from app.schemas.obligation import ObligationCreate, ObligationUpdate, ObligationResponse
from app.services.deadline_tracker import calculate_deadline_status
from app.services.risk_scorer import calculate_risk_level

router = APIRouter(prefix="/api/obligations", tags=["Obligations"])

@router.post("", response_model=ObligationResponse, status_code=status.HTTP_201_CREATED)
def create_obligation_manually(
    payload: ObligationCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    FR-4.3: Manually add new custom obligation row missed during automated parsing.
    """
    # Ensure contract belongs to current user
    contract = db.query(Contract).filter(
        Contract.contract_id == payload.contract_id,
        Contract.user_id == current_user.user_id
    ).first()
    if not contract:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Contract not found.")

    dl_status = calculate_deadline_status(payload.due_date)
    risk = calculate_risk_level(payload.monetary_value, payload.late_penalty, dl_status)

    ob = Obligation(
        contract_id=payload.contract_id,
        description=payload.description,
        responsible_party=payload.responsible_party,
        due_date=payload.due_date,
        monetary_value=payload.monetary_value,
        currency=payload.currency or "USD",
        late_penalty=payload.late_penalty,
        source_clause=payload.source_clause or "Manually added by user",
        verification_status="VERIFIED",
        deadline_status=dl_status,
        risk_level=risk
    )
    db.add(ob)
    db.commit()
    db.refresh(ob)
    return ob

@router.put("/{obligation_id}", response_model=ObligationResponse)
def update_obligation(
    obligation_id: int,
    payload: ObligationUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    FR-4.2: Inline editing for human verification and correction.
    """
    ob = db.query(Obligation).join(Contract).filter(
        Obligation.obligation_id == obligation_id,
        Contract.user_id == current_user.user_id
    ).first()
    if not ob:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Obligation not found.")

    update_data = payload.model_dump(exclude_unset=True)
    for field, val in update_data.items():
        setattr(ob, field, val)

    # Recalculate deadline and risk levels if relevant fields changed
    ob.deadline_status = calculate_deadline_status(ob.due_date)
    ob.risk_level = calculate_risk_level(ob.monetary_value, ob.late_penalty, ob.deadline_status)

    db.commit()
    db.refresh(ob)
    return ob

@router.delete("/{obligation_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_obligation(
    obligation_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    FR-4.2: Delete erroneous obligation row.
    """
    ob = db.query(Obligation).join(Contract).filter(
        Obligation.obligation_id == obligation_id,
        Contract.user_id == current_user.user_id
    ).first()
    if not ob:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Obligation not found.")

    db.delete(ob)
    db.commit()
    return None

@router.patch("/{obligation_id}/verify", response_model=ObligationResponse)
def toggle_verification(
    obligation_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Mark an obligation as human-verified.
    """
    ob = db.query(Obligation).join(Contract).filter(
        Obligation.obligation_id == obligation_id,
        Contract.user_id == current_user.user_id
    ).first()
    if not ob:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Obligation not found.")

    ob.verification_status = "VERIFIED" if ob.verification_status != "VERIFIED" else "PENDING"
    db.commit()
    db.refresh(ob)
    return ob
