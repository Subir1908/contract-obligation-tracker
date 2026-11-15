from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from app.schemas.obligation import ObligationResponse

class ContractBase(BaseModel):
    filename: str
    file_type: str

class ContractUploadResponse(BaseModel):
    status: str
    message: str
    contract_id: int
    filename: str
    page_count: int
    extracted_obligations_count: int

class ContractResponse(ContractBase):
    contract_id: int
    user_id: int
    page_count: int
    upload_date: datetime
    processing_status: str
    error_message: Optional[str] = None
    obligations: Optional[List[ObligationResponse]] = []

    class Config:
        from_attributes = True
