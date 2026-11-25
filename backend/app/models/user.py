from sqlalchemy import Column, Integer, String, DateTime
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from app.core.database import Base

class User(Base):
    __tablename__ = "users"

    user_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    phone = Column(String(30), nullable=True, index=True)
    password_hash = Column(String(255), nullable=False)
    name = Column(String(255), nullable=True, default="")
    organization = Column(String(255), nullable=False, default="Tezpur University Legal Cell", index=True)
    role = Column(String(50), nullable=False, default="ADMIN_LEGAL_OFFICER")
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    contracts = relationship("Contract", back_populates="user", cascade="all, delete-orphan")
