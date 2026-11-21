"""
User and Authentication Database Models (SQLAlchemy).
IMPORTANT PRIVACY RULE:
Only stores user identity and salted password hashes.
Raw passwords, raw screenshots, and private screen contents are NEVER stored.
"""

from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import relationship, declarative_base

Base = declarative_base()

def utc_now():
    return datetime.now(timezone.utc)

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    full_name = Column(String(120), nullable=False)
    email = Column(String(255), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    created_at = Column(DateTime, default=utc_now, nullable=False)
    updated_at = Column(DateTime, default=utc_now, onupdate=utc_now, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)

    reset_tokens = relationship("PasswordResetToken", back_populates="user", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<User id={self.id} email={self.email} active={self.is_active}>"


class PasswordResetToken(Base):
    __tablename__ = "password_reset_tokens"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    token_hash = Column(String(255), unique=True, index=True, nullable=False)
    expires_at = Column(DateTime, nullable=False)
    used = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime, default=utc_now, nullable=False)

    user = relationship("User", back_populates="reset_tokens")

    def __repr__(self):
        return f"<PasswordResetToken user_id={self.user_id} used={self.used}>"
