from pydantic import BaseModel, ConfigDict
from pydantic.alias_generators import to_camel
from typing import Optional, List
from datetime import datetime
from app.schemas.obligation import ObligationResponse

class ContractBase(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)

    filename: str
    file_type: str

class ContractUploadResponse(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)

    status: str
    message: str
    contract_id: int
    filename: str
    page_count: int
    extracted_obligations_count: int

class ContractResponse(ContractBase):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True, from_attributes=True)

    contract_id: int
    user_id: int
    page_count: int
    upload_date: datetime
    processing_status: str
    error_message: Optional[str] = None
    obligations: Optional[List[ObligationResponse]] = []
