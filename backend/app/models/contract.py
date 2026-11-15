from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from app.core.database import Base

class Contract(Base):
    __tablename__ = "contracts"

    contract_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.user_id", ondelete="CASCADE"), nullable=False, index=True)
    filename = Column(String(255), nullable=False)
    file_type = Column(String(10), nullable=False)  # PDF or DOCX
    file_path = Column(String(500), nullable=False)
    page_count = Column(Integer, default=1)
    upload_date = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    processing_status = Column(String(50), default="PENDING", nullable=False) # PENDING, PROCESSING, COMPLETED, FAILED
    error_message = Column(Text, nullable=True)

    user = relationship("User", back_populates="contracts")
    obligations = relationship("Obligation", back_populates="contract", cascade="all, delete-orphan")
