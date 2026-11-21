"""
Authentication Dependencies for FastAPI Endpoints.
Extracts and validates JWT tokens from HTTP Authorization headers and HTTP-only cookies.
"""

from typing import Optional
from fastapi import Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from ..config import settings
from ..database import get_db
from ..models.user import User
from ..services.auth_security import decode_token

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login", auto_error=False)

async def get_token_from_request(
    request: Request,
    header_token: Optional[str] = Depends(oauth2_scheme)
) -> Optional[str]:
    """Retrieves token from Authorization header or HTTP-only cookie."""
    if header_token:
        return header_token
    # Check secure cookie fallback
    cookie_token = request.cookies.get("shield_access_token")
    if cookie_token:
        return cookie_token
    return None

async def get_current_user(
    token: Optional[str] = Depends(get_token_from_request),
    db: Session = Depends(get_db)
) -> User:
    """
    Enforces authentication on protected routes.
    Raises HTTP 401 Unauthorized if token is absent, invalid, or expired.
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Authentication required. Please sign in to Shield-Agent.",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    if not token:
        raise credentials_exception

    payload = decode_token(token)
    if not payload or payload.get("type") != "access":
        raise credentials_exception

    email: str = payload.get("sub")
    if not email:
        raise credentials_exception

    user = db.query(User).filter(User.email == email).first()
    if not user or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User account is deactivated or no longer exists.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return user

async def get_optional_current_user(
    token: Optional[str] = Depends(get_token_from_request),
    db: Session = Depends(get_db)
) -> Optional[User]:
    """Returns authenticated user if valid token exists, otherwise None."""
    if not token:
        return None
    payload = decode_token(token)
    if not payload or payload.get("type") != "access":
        return None
    email: str = payload.get("sub")
    if not email:
        return None
    user = db.query(User).filter(User.email == email).first()
    if user and user.is_active:
        return user
    return None
