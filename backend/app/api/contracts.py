import os
import uuid
import shutil
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Query, Response
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.models.contract import Contract
from app.models.obligation import Obligation
from app.schemas.contract import ContractResponse, ContractUploadResponse
from app.schemas.obligation import ObligationResponse
from app.services.document_parser import validate_and_parse_document
from app.services.deadline_tracker import calculate_deadline_status
from app.services.risk_scorer import calculate_risk_level
from app.services.export_service import export_to_csv, export_to_xlsx, export_to_ics
try:
    from app.nlp.extractor import extract_obligations
except ImportError:
    from app.nlp.extractor import extract_obligations

router = APIRouter(prefix="/api/contracts", tags=["Contracts"])

@router.post("/upload", response_model=ContractUploadResponse, status_code=status.HTTP_201_CREATED)
async def upload_contract(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    FR-2: Ingest PDF or DOCX file.
    FR-3: Parse & extract the 5 core contract obligation fields.
    NFR-3: Isolated strictly to the authenticated user's workspace.
    """
    original_filename = file.filename or "contract.pdf"
    ext = os.path.splitext(original_filename)[1].lower()
    if ext not in [".pdf", ".docx"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Unsupported format. Only .pdf and .docx documents are accepted."
        )

    # Save to temporary runtime storage with unique UUID filename to prevent collisions
    unique_filename = f"{uuid.uuid4()}{ext}"
    saved_file_path = os.path.join(settings.UPLOAD_DIR, unique_filename)

    try:
        with open(saved_file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to save uploaded file: {str(e)}"
        )

    # Validate and parse document text
    try:
        extracted_text, page_count, doc_type = validate_and_parse_document(saved_file_path, original_filename)
    except HTTPException:
        if os.path.exists(saved_file_path):
            os.remove(saved_file_path)
        raise

    # Create Contract record in DB
    contract = Contract(
        user_id=current_user.user_id,
        filename=original_filename,
        file_type=doc_type,
        file_path=saved_file_path,
        page_count=page_count,
        processing_status="PROCESSING"
    )
    db.add(contract)
    db.commit()
    db.refresh(contract)

    # Run NLP extraction pipeline
    try:
        raw_obligations = extract_obligations(extracted_text)
        
        # Save extracted obligations with deadline & risk computation
        for raw_item in raw_obligations:
            dl_status = calculate_deadline_status(raw_item.due_date)
            risk = calculate_risk_level(raw_item.monetary_value, raw_item.late_penalty, dl_status)
            
            ob_record = Obligation(
                contract_id=contract.contract_id,
                description=raw_item.description,
                responsible_party=raw_item.responsible_party,
                due_date=raw_item.due_date,
                monetary_value=raw_item.monetary_value,
                currency=raw_item.currency,
                late_penalty=raw_item.late_penalty,
                source_clause=raw_item.source_clause,
                verification_status="PENDING",
                deadline_status=dl_status,
                risk_level=risk
            )
            db.add(ob_record)

        contract.processing_status = "COMPLETED"
        db.commit()
        db.refresh(contract)

        return ContractUploadResponse(
            status="success",
            message="Contract uploaded and processed successfully",
            contract_id=contract.contract_id,
            filename=contract.filename,
            page_count=contract.page_count,
            extracted_obligations_count=len(raw_obligations)
        )
    except Exception as e:
        contract.processing_status = "FAILED"
        contract.error_message = str(e)
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"NLP extraction failed: {str(e)}"
        )

@router.get("", response_model=List[ContractResponse])
def get_user_contracts(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Retrieve all contracts belonging to authenticated user."""
    return db.query(Contract).filter(Contract.user_id == current_user.user_id).order_by(Contract.upload_date.desc()).all()

@router.get("/{contract_id}", response_model=ContractResponse)
def get_contract_details(
    contract_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    contract = db.query(Contract).filter(
        Contract.contract_id == contract_id,
        Contract.user_id == current_user.user_id
    ).first()
    if not contract:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Contract not found.")
    return contract

@router.delete("/{contract_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_contract(
    contract_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Delete a contract and its associated obligations.
    """
    contract = db.query(Contract).filter(
        Contract.contract_id == contract_id,
        Contract.user_id == current_user.user_id
    ).first()
    if not contract:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Contract not found.")

    # Delete obligations linked to contract
    db.query(Obligation).filter(Obligation.contract_id == contract_id).delete()

    # Clean up file on disk if exists
    if contract.file_path and os.path.exists(contract.file_path):
        try:
            os.remove(contract.file_path)
        except Exception:
            pass

    db.delete(contract)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)

@router.get("/{contract_id}/preview")
def preview_contract(
    contract_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    FR-2.4: Side-by-side interactive document preview stream.
    """
    contract = db.query(Contract).filter(
        Contract.contract_id == contract_id,
        Contract.user_id == current_user.user_id
    ).first()
    if not contract or not os.path.exists(contract.file_path):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document file not found.")

    media_type = "application/pdf" if contract.file_type == "PDF" else "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    return FileResponse(contract.file_path, media_type=media_type, filename=contract.filename)

@router.get("/{contract_id}/obligations", response_model=List[ObligationResponse])
def get_contract_obligations(
    contract_id: int,
    status_filter: Optional[str] = Query(None, description="Filter by deadline status: UPCOMING, DUE_TODAY, OVERDUE"),
    risk_filter: Optional[str] = Query(None, description="Filter by risk level: LOW, MEDIUM, HIGH"),
    search: Optional[str] = Query(None, description="Search keyword in description or party"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    contract = db.query(Contract).filter(
        Contract.contract_id == contract_id,
        Contract.user_id == current_user.user_id
    ).first()
    if not contract:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Contract not found.")

    query = db.query(Obligation).filter(Obligation.contract_id == contract_id)

    if status_filter:
        query = query.filter(Obligation.deadline_status == status_filter.upper())
    if risk_filter:
        query = query.filter(Obligation.risk_level == risk_filter.upper())
    if search:
        kw = f"%{search}%"
        query = query.filter((Obligation.description.ilike(kw)) | (Obligation.responsible_party.ilike(kw)))

    return query.order_by(Obligation.due_date.asc().nullslast()).all()

@router.get("/{contract_id}/export")
def export_contract_obligations(
    contract_id: int,
    format: str = Query("csv", pattern="^(csv|xlsx|ics)$"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    FR-6: Export verified tabular data into .csv, .xlsx or .ics calendar files.
    """
    contract = db.query(Contract).filter(
        Contract.contract_id == contract_id,
        Contract.user_id == current_user.user_id
    ).first()
    if not contract:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Contract not found.")

    obligations = db.query(Obligation).filter(Obligation.contract_id == contract_id).all()
    if not obligations:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No obligations to export.")

    base_name = os.path.splitext(contract.filename)[0]

    if format == "csv":
        csv_content = export_to_csv(obligations)
        return Response(
            content=csv_content,
            media_type="text/csv",
            headers={"Content-Disposition": f'attachment; filename="{base_name}_obligations.csv"'}
        )
    elif format == "xlsx":
        xlsx_bytes = export_to_xlsx(obligations)
        return Response(
            content=xlsx_bytes,
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": f'attachment; filename="{base_name}_obligations.xlsx"'}
        )
    elif format == "ics":
        ics_content = export_to_ics(obligations, contract.filename)
        return Response(
            content=ics_content,
            media_type="text/calendar",
            headers={"Content-Disposition": f'attachment; filename="{base_name}_milestones.ics"'}
        )
