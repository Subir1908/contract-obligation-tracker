from sqlalchemy import Column, Integer, String, Float, Date, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from app.core.database import Base

class Obligation(Base):
    __tablename__ = "obligations"

    obligation_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    contract_id = Column(Integer, ForeignKey("contracts.contract_id", ondelete="CASCADE"), nullable=False, index=True)
    description = Column(Text, nullable=False)
    responsible_party = Column(String(255), nullable=True)
    due_date = Column(Date, nullable=True)
    monetary_value = Column(Float, nullable=True)
    currency = Column(String(10), nullable=True)  # USD, INR, EUR, etc.
    late_penalty = Column(Text, nullable=True)
    source_clause = Column(Text, nullable=True)
    category = Column(String(50), default="Deliverable", nullable=False)
    verification_status = Column(String(50), default="UNVERIFIED", nullable=False)  # UNVERIFIED, VERIFIED
    deadline_status = Column(String(50), default="UPCOMING", nullable=False)      # UPCOMING, DUE_TODAY, OVERDUE, NONE
    risk_level = Column(String(50), default="LOW", nullable=False)               # LOW, MEDIUM, HIGH
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)

    contract = relationship("Contract", back_populates="obligations")
