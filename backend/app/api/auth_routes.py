"""
Authentication API Endpoints for Shield-Agent.
Provides:
- POST /api/auth/register
- POST /api/auth/login
- POST /api/auth/logout
- GET /api/auth/me
- POST /api/auth/forgot-password
- POST /api/auth/reset-password
- POST /api/auth/refresh
"""

from datetime import datetime, timedelta, timezone
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status, Response, Request
from sqlalchemy.orm import Session
from ..database import get_db
from ..models.user import User, PasswordResetToken
from ..models.auth_schemas import (
    UserRegisterRequest,
    UserLoginRequest,
    ForgotPasswordRequest,
    ResetPasswordRequest,
    RefreshTokenRequest,
    UserResponse,
    AuthResponse,
    MessageResponse
)
from ..services.auth_security import (
    hash_password,
    verify_password,
    create_access_token,
    create_refresh_token,
    decode_token,
    generate_reset_token,
    hash_token
)
from .auth_deps import get_current_user
from ..config import settings

auth_router = APIRouter(prefix="/api/auth", tags=["Authentication"])

@auth_router.post("/register", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
async def register(
    payload: UserRegisterRequest,
    response: Response,
    db: Session = Depends(get_db)
):
    """
    Registers a new user account.
    Passwords are automatically salted and hashed with bcrypt.
    """
    email_clean = payload.email.lower().strip()
    
    # Check if user already exists
    existing_user = db.query(User).filter(User.email == email_clean).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An account with this email address is already registered."
        )

    # Create new user
    new_user = User(
        full_name=payload.full_name.strip(),
        email=email_clean,
        password_hash=hash_password(payload.password),
        is_active=True
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    # Issue JWT tokens
    access_token = create_access_token(data={"sub": new_user.email, "uid": new_user.id})
    refresh_token = create_refresh_token(data={"sub": new_user.email, "uid": new_user.id})

    # Set secure HTTP-only cookies
    response.set_cookie(
        key="shield_access_token",
        value=access_token,
        httponly=True,
        samesite="lax",
        secure=False,  # Set to True in production with HTTPS
        max_age=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60
    )
    response.set_cookie(
        key="shield_refresh_token",
        value=refresh_token,
        httponly=True,
        samesite="lax",
        secure=False,
        max_age=settings.REFRESH_TOKEN_EXPIRE_DAYS * 24 * 3600
    )

    return AuthResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        token_type="bearer",
        user=UserResponse.model_validate(new_user)
    )

@auth_router.post("/login", response_model=AuthResponse)
async def login(
    payload: UserLoginRequest,
    response: Response,
    db: Session = Depends(get_db)
):
    """
    Authenticates user and returns JWT access & refresh tokens.
    Does NOT leak whether the email exists upon failure.
    """
    email_clean = payload.email.lower().strip()
    user = db.query(User).filter(User.email == email_clean).first()

    # Generic non-revealing error
    invalid_creds_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid email or password.",
        headers={"WWW-Authenticate": "Bearer"}
    )

    if not user:
        raise invalid_creds_exception

    if not verify_password(payload.password, user.password_hash):
        raise invalid_creds_exception

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is inactive. Please contact support."
        )

    # Handle remember_me
    access_delta = timedelta(days=7) if payload.remember_me else timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(data={"sub": user.email, "uid": user.id}, expires_delta=access_delta)
    refresh_token = create_refresh_token(data={"sub": user.email, "uid": user.id})

    # Set HTTP-only cookies
    response.set_cookie(
        key="shield_access_token",
        value=access_token,
        httponly=True,
        samesite="lax",
        secure=False,
        max_age=int(access_delta.total_seconds())
    )
    response.set_cookie(
        key="shield_refresh_token",
        value=refresh_token,
        httponly=True,
        samesite="lax",
        secure=False,
        max_age=settings.REFRESH_TOKEN_EXPIRE_DAYS * 24 * 3600
    )

    return AuthResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        token_type="bearer",
        user=UserResponse.model_validate(user)
    )

@auth_router.post("/logout", response_model=MessageResponse)
async def logout(response: Response):
    """Clears authentication cookies."""
    response.delete_cookie(key="shield_access_token")
    response.delete_cookie(key="shield_refresh_token")
    return MessageResponse(status="success", message="Successfully logged out of Shield-Agent.")

@auth_router.get("/me", response_model=UserResponse)
async def get_me(current_user: User = Depends(get_current_user)):
    """Returns profile for currently authenticated user."""
    return UserResponse.model_validate(current_user)

@auth_router.post("/forgot-password", response_model=MessageResponse)
async def forgot_password(
    payload: ForgotPasswordRequest,
    db: Session = Depends(get_db)
):
    """
    Initiates password recovery.
    CRITICAL SECURITY RULE: Does NOT reveal whether the email exists.
    """
    email_clean = payload.email.lower().strip()
    user = db.query(User).filter(User.email == email_clean).first()

    dev_token: Optional[str] = None

    if user:
        raw_token = generate_reset_token()
        token_hash_str = hash_token(raw_token)
        expires_at = datetime.now(timezone.utc) + timedelta(hours=1)

        reset_record = PasswordResetToken(
            user_id=user.id,
            token_hash=token_hash_str,
            expires_at=expires_at,
            used=False
        )
        db.add(reset_record)
        db.commit()

        # In dev mode, return the token so automated tests or dev flows work seamlessly
        if settings.DEBUG:
            dev_token = raw_token

    return MessageResponse(
        status="success",
        message="If this email is registered in Shield-Agent, reset instructions have been dispatched.",
        dev_reset_token=dev_token
    )

@auth_router.post("/reset-password", response_model=MessageResponse)
async def reset_password(
    payload: ResetPasswordRequest,
    db: Session = Depends(get_db)
):
    """
    Completes password reset flow using token and invalidates token.
    """
    token_hash_str = hash_token(payload.token)
    now = datetime.now(timezone.utc)

    record = db.query(PasswordResetToken).filter(
        PasswordResetToken.token_hash == token_hash_str,
        PasswordResetToken.used == False,
        PasswordResetToken.expires_at > now
    ).first()

    if not record:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid, expired, or already used password reset token."
        )

    # Update user password
    user = db.query(User).filter(User.id == record.user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User account not found.")

    user.password_hash = hash_password(payload.new_password)
    user.updated_at = now
    
    # Invalidate reset token
    record.used = True

    db.commit()

    return MessageResponse(
        status="success",
        message="Password has been successfully updated. You may now sign in with your new credentials."
    )

@auth_router.post("/refresh", response_model=AuthResponse)
async def refresh_tokens(
    payload: RefreshTokenRequest,
    request: Request,
    response: Response,
    db: Session = Depends(get_db)
):
    """Refreshes expired access token using valid refresh token."""
    raw_refresh = payload.refresh_token or request.cookies.get("shield_refresh_token")
    if not raw_refresh:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Refresh token required.")

    decoded = decode_token(raw_refresh)
    if not decoded or decoded.get("type") != "refresh":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired refresh token.")

    email = decoded.get("sub")
    user = db.query(User).filter(User.email == email).first()
    if not user or not user.is_active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found or inactive.")

    new_access = create_access_token(data={"sub": user.email, "uid": user.id})
    new_refresh = create_refresh_token(data={"sub": user.email, "uid": user.id})

    response.set_cookie(
        key="shield_access_token",
        value=new_access,
        httponly=True,
        samesite="lax",
        secure=False,
        max_age=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60
    )
    response.set_cookie(
        key="shield_refresh_token",
        value=new_refresh,
        httponly=True,
        samesite="lax",
        secure=False,
        max_age=settings.REFRESH_TOKEN_EXPIRE_DAYS * 24 * 3600
    )

    return AuthResponse(
        access_token=new_access,
        refresh_token=new_refresh,
        token_type="bearer",
        user=UserResponse.model_validate(user)
    )
