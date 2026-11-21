"""
Dedicated Authentication & Authorization Test Suite for Shield-Agent.
Tests:
1. User registration with validation and duplicate handling.
2. User login with valid and invalid credentials.
3. Incorrect password rejection without leaking email existence.
4. Protected route authorization with JWT and HTTP-only cookies.
5. Logout clearing sessions.
6. Password hashing verification (bcrypt).
7. Password reset flow (request link, token validation, password update, token invalidation).
8. Expired or invalid token rejection.
"""

import pytest
from datetime import datetime, timedelta, timezone
from fastapi.testclient import TestClient
import sys
from pathlib import Path

backend_path = Path(__file__).resolve().parent.parent / "backend"
sys.path.insert(0, str(backend_path))

from app.main import app
from app.database import init_db, SessionLocal
from app.models.user import User, PasswordResetToken
from app.services.auth_security import hash_password, verify_password, create_access_token
from app.config import settings

init_db()

def get_clean_client():
    return TestClient(app)

def test_password_hashing_bcrypt():
    """Verify passwords are salted and hashed using bcrypt."""
    plain = "SuperCyberPass#2026!"
    hashed = hash_password(plain)
    assert hashed != plain
    assert hashed.startswith("$2b$") or hashed.startswith("$2a$")
    assert verify_password(plain, hashed) is True
    assert verify_password("WrongPassword123!", hashed) is False

def test_user_registration_success():
    """Verify new user registration issues tokens and creates database entry."""
    client = get_clean_client()
    unique_email = f"agent.test_{int(datetime.now(timezone.utc).timestamp())}@shield.local"
    payload = {
        "full_name": "Test Cyber Agent",
        "email": unique_email,
        "password": "SecurePassword#2026!",
        "confirm_password": "SecurePassword#2026!"
    }
    response = client.post("/api/auth/register", json=payload)
    assert response.status_code == 201
    data = response.json()
    assert "access_token" in data
    assert "refresh_token" in data
    assert data["user"]["email"] == unique_email
    assert data["user"]["full_name"] == "Test Cyber Agent"
    assert "shield_access_token" in response.cookies

def test_duplicate_registration_rejected():
    """Verify duplicate email registrations are blocked."""
    client = get_clean_client()
    email = f"duplicate.test_{int(datetime.now(timezone.utc).timestamp())}@shield.local"
    payload = {
        "full_name": "Agent Alpha",
        "email": email,
        "password": "SecurePassword#2026!",
        "confirm_password": "SecurePassword#2026!"
    }
    res1 = client.post("/api/auth/register", json=payload)
    assert res1.status_code == 201

    # Second registration with same email
    res2 = client.post("/api/auth/register", json=payload)
    assert res2.status_code == 400
    assert "already registered" in res2.json()["detail"]

def test_registration_password_mismatch():
    """Verify registration fails if confirm_password does not match."""
    client = get_clean_client()
    payload = {
        "full_name": "Agent Beta",
        "email": "mismatch@shield.local",
        "password": "SecurePassword#2026!",
        "confirm_password": "DifferentPassword#2026!"
    }
    response = client.post("/api/auth/register", json=payload)
    assert response.status_code == 422 # Pydantic validation error

def test_login_success():
    """Verify login with correct credentials returns token and user profile."""
    client = get_clean_client()
    response = client.post("/api/auth/login", json={
        "email": settings.DEMO_USER_EMAIL,
        "password": settings.DEMO_USER_PASSWORD,
        "remember_me": True
    })
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["user"]["email"] == settings.DEMO_USER_EMAIL
    assert "shield_access_token" in response.cookies

def test_login_incorrect_password():
    """Verify login failure with incorrect password returns 401."""
    client = get_clean_client()
    response = client.post("/api/auth/login", json={
        "email": settings.DEMO_USER_EMAIL,
        "password": "WrongPassword#999"
    })
    assert response.status_code == 401
    assert "Invalid email or password" in response.json()["detail"]

def test_login_nonexistent_email():
    """Verify non-existent email returns generic 401 without revealing account absence."""
    client = get_clean_client()
    response = client.post("/api/auth/login", json={
        "email": "ghost.user@doesnotexist.local",
        "password": "SomePassword#123"
    })
    assert response.status_code == 401
    assert "Invalid email or password" in response.json()["detail"]

def test_protected_route_unauthorized():
    """Verify GET /api/auth/me rejects requests without token."""
    client = get_clean_client()
    response = client.get("/api/auth/me")
    assert response.status_code == 401

def test_protected_route_authorized():
    """Verify GET /api/auth/me returns profile when authenticated."""
    client = get_clean_client()
    login_res = client.post("/api/auth/login", json={
        "email": settings.DEMO_USER_EMAIL,
        "password": settings.DEMO_USER_PASSWORD
    })
    token = login_res.json()["access_token"]

    response = client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 200
    data = response.json()
    assert data["email"] == settings.DEMO_USER_EMAIL
    assert data["full_name"] == settings.DEMO_USER_NAME
    assert data["is_active"] is True

def test_logout():
    """Verify logout removes authentication cookies."""
    client = get_clean_client()
    # Log in first to set cookies
    client.post("/api/auth/login", json={
        "email": settings.DEMO_USER_EMAIL,
        "password": settings.DEMO_USER_PASSWORD
    })
    response = client.post("/api/auth/logout")
    assert response.status_code == 200
    assert response.json()["status"] == "success"

def test_forgot_and_reset_password_flow():
    """Verify end-to-end password reset flow and token invalidation."""
    client = get_clean_client()
    email = settings.DEMO_USER_EMAIL

    # 1. Request forgot password
    res_forgot = client.post("/api/auth/forgot-password", json={"email": email})
    assert res_forgot.status_code == 200
    dev_token = res_forgot.json().get("dev_reset_token")
    assert dev_token is not None

    # 2. Reset password using token
    new_pass = "BrandNewSuperSecret#2026!"
    res_reset = client.post("/api/auth/reset-password", json={
        "token": dev_token,
        "new_password": new_pass,
        "confirm_password": new_pass
    })
    assert res_reset.status_code == 200
    assert "successfully updated" in res_reset.json()["message"]

    # 3. Verify old password fails
    res_old_login = client.post("/api/auth/login", json={
        "email": email,
        "password": settings.DEMO_USER_PASSWORD
    })
    assert res_old_login.status_code == 401

    # 4. Verify new password succeeds
    res_new_login = client.post("/api/auth/login", json={
        "email": email,
        "password": new_pass
    })
    assert res_new_login.status_code == 200

    # 5. Verify reset token is invalidated (cannot be reused)
    res_reuse = client.post("/api/auth/reset-password", json={
        "token": dev_token,
        "new_password": "AnotherPassword#2026!",
        "confirm_password": "AnotherPassword#2026!"
    })
    assert res_reuse.status_code == 400
    assert "Invalid, expired, or already used" in res_reuse.json()["detail"]

    # Reset back to default demo password for other tests
    db = SessionLocal()
    u = db.query(User).filter(User.email == email).first()
    u.password_hash = hash_password(settings.DEMO_USER_PASSWORD)
    db.commit()
    db.close()

def test_invalid_or_expired_jwt_token():
    """Verify expired or tampered token is rejected with 401."""
    client = get_clean_client()
    expired_token = create_access_token(
        data={"sub": settings.DEMO_USER_EMAIL, "uid": 1},
        expires_delta=timedelta(seconds=-10) # Expired 10 seconds ago
    )
    response = client.get("/api/auth/me", headers={"Authorization": f"Bearer {expired_token}"})
    assert response.status_code == 401
