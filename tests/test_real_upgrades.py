"""
Automated Test Suite for Shield-Agent Real Working Upgrades.
Tests:
- Real AI Provider config and unconfigured behavior
- Credit card Luhn validation (valid card detected, random numbers rejected)
- Indian PAN, Aadhaar, and UPI detection
- Password protection (guaranteeing password values are never accepted or transmitted)
- PrivacyGate fail-closed behavior on raw leaks
- Scans, Telemetry History, and Tasks History persistence
"""

import pytest
from fastapi.testclient import TestClient
import sys
from pathlib import Path
backend_path = Path(__file__).resolve().parent.parent / "backend"
sys.path.insert(0, str(backend_path))

from app.main import app
from app.privacy.validator import ServerPrivacyValidator, luhn_verify
from app.ai.provider import get_ai_provider, CloudAIProvider, MockAIProvider, UnconfiguredAIProvider, get_ai_status
from app.models.schemas import SanitizedContextRequest, RedactedElementMetadata

client = TestClient(app)

@pytest.fixture
def auth_headers():
    login_resp = client.post("/api/auth/login", json={
        "email": "demo@shieldagent.local",
        "password": "DemoShield#2026!"
    })
    token = login_resp.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}

def test_luhn_algorithm_validation():
    # Valid 16-digit Visa card number verified by Luhn checksum
    assert luhn_verify("4532015028193917") == True
    # Corrupted check digit (fails Luhn)
    assert luhn_verify("4532015028193918") == False

def test_ai_config_endpoint():
    resp = client.get("/api/ai/config")
    assert resp.status_code == 200
    data = resp.json()
    assert "provider" in data
    assert "model" in data
    assert "is_real_ai" in data
    assert "configured" in data

def test_unconfigured_ai_provider_raises_503():
    unconf = UnconfiguredAIProvider("gemini")
    context = SanitizedContextRequest(
        sanitized=True,
        privacy_verified=True,
        redacted_items_count=0
    )
    with pytest.raises(Exception) as excinfo:
        import asyncio
        asyncio.run(unconf.generate_action("click submit", context))
    assert "503" in str(excinfo.value) or "not configured" in str(excinfo.value).lower()

def test_pan_and_aadhaar_leak_blocked(auth_headers):
    # Test Indian PAN card leak
    payload_pan = {
        "sanitized": True,
        "privacy_verified": True,
        "redacted_items_count": 1,
        "dom_summary": {
            "applicant_pan": "ABCDE1234F"
        }
    }
    resp_pan = client.post("/api/analyze", json=payload_pan, headers=auth_headers)
    assert resp_pan.status_code == 403
    assert "PAN_CARD" in resp_pan.json()["detail"] or "SECURITY VIOLATION" in resp_pan.json()["detail"]

    # Test Indian Aadhaar leak
    payload_aadhaar = {
        "sanitized": True,
        "privacy_verified": True,
        "redacted_items_count": 1,
        "dom_summary": {
            "uid": "2345 6789 0123"
        }
    }
    resp_aadhaar = client.post("/api/analyze", json=payload_aadhaar, headers=auth_headers)
    assert resp_aadhaar.status_code == 403
    assert "AADHAAR" in resp_aadhaar.json()["detail"] or "SECURITY VIOLATION" in resp_aadhaar.json()["detail"]

def test_upi_leak_blocked(auth_headers):
    payload_upi = {
        "sanitized": True,
        "privacy_verified": True,
        "redacted_items_count": 1,
        "dom_summary": {
            "vpa": "testuser@okhdfcbank"
        }
    }
    resp = client.post("/api/analyze", json=payload_upi, headers=auth_headers)
    assert resp.status_code == 403
    assert "UPI_ID" in resp.json()["detail"] or "SECURITY VIOLATION" in resp.json()["detail"]

def test_password_field_never_allows_raw_value(auth_headers):
    # If client attempts to transmit raw password value in element metadata:
    payload = {
        "sanitized": True,
        "privacy_verified": True,
        "redacted_items_count": 1,
        "redacted_elements": [
            {
                "category": "PASSWORD",
                "confidence": 0.99,
                "redaction": "blackout",
                "value": "MySuperSecretPassword123!"  # VIOLATION!
            }
        ]
    }
    resp = client.post("/api/analyze", json=payload, headers=auth_headers)
    assert resp.status_code == 403
    assert "Forbidden field" in resp.json()["detail"] or "SECURITY VIOLATION" in resp.json()["detail"]

def test_prohibit_typing_sensitive_credentials(auth_headers):
    # If AI or agent tries to type a password, validate_action_safety blocks it
    is_safe, violation = ServerPrivacyValidator.validate_action_safety(
        action="type",
        target="password-input",
        suggested_params={"text": "UserSecret123!"}
    )
    assert is_safe == False
    assert "UNSAFE ACTION BLOCKED" in violation

def test_scans_and_telemetry_history_endpoints(auth_headers):
    # 1. Post a valid sanitized scan
    scan_payload = {
        "sanitized": True,
        "privacy_verified": True,
        "redacted_items_count": 2,
        "redacted_elements": [
            {"category": "EMAIL", "confidence": 0.98, "redaction": "mask"},
            {"category": "PASSWORD", "confidence": 0.99, "redaction": "blackout"}
        ],
        "dom_summary": {
            "clickable_elements": [{"tag": "button", "id": "btn-pay", "text": "Pay Now"}]
        },
        "url": "https://example.com/checkout",
        "page_title": "Example Checkout",
        "timing_breakdown": {
            "local_inference_ms": 32.0,
            "redaction_ms": 14.0,
            "privacy_validation_ms": 6.0,
            "network_ms": 18.0
        }
    }
    save_resp = client.post("/api/scans", json=scan_payload, headers=auth_headers)
    assert save_resp.status_code == 200
    assert save_resp.json()["success"] == True

    # 2. Retrieve latest scan
    latest_resp = client.get("/api/scans/latest", headers=auth_headers)
    assert latest_resp.status_code == 200
    latest = latest_resp.json()
    assert latest is not None
    assert latest["url"] == "https://example.com/checkout"
    assert latest["redacted_items_count"] == 2

    # 3. Retrieve telemetry history
    telem_resp = client.get("/api/telemetry/history", headers=auth_headers)
    assert telem_resp.status_code == 200
    assert isinstance(telem_resp.json(), list)

    # 4. Retrieve tasks history
    tasks_resp = client.get("/api/tasks/history", headers=auth_headers)
    assert tasks_resp.status_code == 200
    assert isinstance(tasks_resp.json(), list)

def test_ai_agent_real_website_search_task(auth_headers):
    """Verifies that AI provider correctly resolves real website search inputs from sanitized DOM."""
    payload = {
        "instruction": "Find the search bar",
        "context": {
            "sanitized": True,
            "privacy_verified": True,
            "redacted_items_count": 0,
            "dom_summary": {
                "title": "Wikipedia - Free Encyclopedia",
                "form_fields": [
                    {"tag": "input", "id": "searchInput", "type": "search", "label": "Search Wikipedia", "is_sensitive": False}
                ],
                "clickable_elements": [
                    {"tag": "button", "id": "searchButton", "text": "Search"}
                ]
            }
        }
    }
    resp = client.post("/api/task", json=payload, headers=auth_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert "search" in data["target"].lower()
    assert data["confidence"] >= 0.80

def test_ai_agent_describe_page_task(auth_headers):
    """Verifies that AI provider handles describe/overview instructions on real pages."""
    payload = {
        "instruction": "Describe the primary action on this page",
        "context": {
            "sanitized": True,
            "privacy_verified": True,
            "redacted_items_count": 0,
            "dom_summary": {
                "title": "GitHub Portal",
                "headings": ["Build software better, together."],
                "clickable_elements": [
                    {"tag": "a", "id": "signup-btn", "text": "Sign up for GitHub"}
                ]
            }
        }
    }
    resp = client.post("/api/task", json=payload, headers=auth_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["action"] == "wait"
    assert "summary" in data["reason"].lower() or "github" in data["reason"].lower()

def test_reject_cvv_raw_leak(auth_headers):
    """Verifies that raw CVV leaks trigger HTTP 403 PrivacyGate block."""
    payload = {
        "sanitized": True,
        "privacy_verified": True,
        "redacted_items_count": 1,
        "dom_summary": {
            "card_data": "cvv = '883'"
        }
    }
    resp = client.post("/api/analyze", json=payload, headers=auth_headers)
    assert resp.status_code == 403
    assert "SECRET_LEAK" in resp.json()["detail"] or "SECURITY VIOLATION" in resp.json()["detail"]
