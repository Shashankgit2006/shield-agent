"""
Shield-Agent Backend Unit & Integration Tests.
Verifies:
1. Health and Metrics endpoints.
2. RAW SENSITIVE DATA CANNOT BE SENT.
3. Unsanitized requests are strictly rejected with HTTP 403.
4. Raw PII in DOM summaries is caught by secondary server-side inspection.
5. Structured AI actions are generated safely without credential typing.
6. Authentication enforcement on protected routes.
"""

import pytest
from fastapi.testclient import TestClient
import sys
from pathlib import Path

# Add backend directory to sys.path
backend_path = Path(__file__).resolve().parent.parent / "backend"
sys.path.insert(0, str(backend_path))

from app.main import app
from app.database import init_db

init_db()
client = TestClient(app)

@pytest.fixture
def auth_headers():
    """Provides valid Bearer token headers using seeded demo account."""
    res = client.post("/api/auth/login", json={
        "email": "demo@shieldagent.local",
        "password": "DemoShield#2026!"
    })
    assert res.status_code == 200
    token = res.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}

def test_health_endpoint():
    """Verify health status and active privacy gate (public)."""
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["privacy_gate"] == "enforced"
    assert "Raw sensitive data transmission strictly forbidden" in data["message"]

def test_unauthenticated_request_rejected():
    """CRITICAL SECURITY TEST: Unauthenticated requests to protected endpoints must be 401."""
    response = client.get("/api/metrics")
    assert response.status_code == 401
    assert "Authentication required" in response.json()["detail"]

def test_metrics_endpoint(auth_headers):
    """Verify metrics calculation and privacy evaluation formulas when authenticated."""
    response = client.get("/api/metrics", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["precision"] > 0.90
    assert data["recall"] > 0.95
    assert data["f1_score"] > 0.90
    assert data["data_reduction_pct"] > 50.0
    assert "end_to_end_latency_ms" in data

def test_reject_unsanitized_context(auth_headers):
    """CRITICAL SECURITY TEST: Unsanitized payloads must be hard-blocked even if authenticated."""
    payload = {
        "sanitized": False,  # Client failed or did not sanitize
        "privacy_verified": True,
        "redacted_items_count": 0,
    }
    response = client.post("/api/analyze", json=payload, headers=auth_headers)
    assert response.status_code == 403
    assert "REQUEST BLOCKED" in response.json()["detail"]

def test_reject_unverified_privacy_gate(auth_headers):
    """CRITICAL SECURITY TEST: Bypassing client PrivacyGate must be blocked."""
    payload = {
        "sanitized": True,
        "privacy_verified": False,  # PrivacyGate did not verify
        "redacted_items_count": 0,
    }
    response = client.post("/api/analyze", json=payload, headers=auth_headers)
    assert response.status_code == 403
    assert "Client PrivacyGate verification is missing" in response.json()["detail"]

def test_reject_raw_credit_card_leak(auth_headers):
    """CRITICAL SECURITY TEST: Leaked credit card number in DOM summary must trigger 403."""
    payload = {
        "sanitized": True,
        "privacy_verified": True,
        "redacted_items_count": 1,
        "dom_summary": {
            "leaked_field": "4532015028193912"  # Raw credit card number leaked in text!
        }
    }
    response = client.post("/api/analyze", json=payload, headers=auth_headers)
    assert response.status_code == 403
    assert "SECURITY VIOLATION: Potential raw CREDIT_CARD" in response.json()["detail"]

def test_reject_raw_password_leak(auth_headers):
    """CRITICAL SECURITY TEST: Leaked password assignment in DOM summary must trigger 403."""
    payload = {
        "sanitized": True,
        "privacy_verified": True,
        "redacted_items_count": 1,
        "dom_summary": {
            "form_state": "password = 'MySecretPassword123!'"
        }
    }
    response = client.post("/api/analyze", json=payload, headers=auth_headers)
    assert response.status_code == 403
    assert "SECURITY VIOLATION: Potential raw PASSWORD_LEAK" in response.json()["detail"]

def test_accept_properly_sanitized_context(auth_headers):
    """Properly sanitized context with zero raw values must be accepted."""
    payload = {
        "sanitized": True,
        "privacy_verified": True,
        "redacted_items_count": 5,
        "redacted_elements": [
            {
                "category": "PASSWORD",
                "confidence": 0.99,
                "redaction": "blackout",
                "bbox": {"x": 100, "y": 200, "width": 150, "height": 30}
            },
            {
                "category": "EMAIL",
                "confidence": 0.98,
                "redaction": "mask",
                "bbox": {"x": 100, "y": 250, "width": 200, "height": 30}
            }
        ],
        "dom_summary": {
            "title": "Registration Demo",
            "clickable_elements": [
                {"tag": "button", "id": "submit-btn", "text": "Submit Registration"}
            ]
        }
    }
    response = client.post("/api/analyze", json=payload, headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["privacy_gate_status"] == "PASSED_STRICT_INSPECTION"
    assert data["redacted_regions_respected"] == 5

def test_task_execution_structured_action(auth_headers):
    """Verify AI generates safe structured action for 'Find the Submit button'."""
    payload = {
        "instruction": "Find the Submit button and click it.",
        "context": {
            "sanitized": True,
            "privacy_verified": True,
            "redacted_items_count": 3,
            "dom_summary": {
                "clickable_elements": [
                    {"tag": "button", "id": "submit-btn", "type": "submit", "text": "Submit Registration"}
                ]
            }
        }
    }
    response = client.post("/api/task", json=payload, headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["action"] == "click"
    assert "submit" in data["target"].lower()
    assert data["confidence"] >= 0.90
    assert data["privacy_verified"] is True

def test_task_block_unsafe_credential_typing():
    """CRITICAL SECURITY TEST: Agent attempting to type credentials must be blocked."""
    from app.privacy.validator import ServerPrivacyValidator
    
    # Direct test of safety validator
    safe, reason = ServerPrivacyValidator.validate_action_safety(
        action="type",
        target="password-field",
        suggested_params={"text": "SuperSecretPassword!"}
    )
    assert safe is False
    assert "UNSAFE ACTION BLOCKED" in reason
