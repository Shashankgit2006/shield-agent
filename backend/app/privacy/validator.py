"""
Server-side Privacy Verification Module.
Acts as the mandatory secondary defense layer. Ensures the server NEVER processes
unsanitized or raw PII data, even if a client attempts to bypass the client-side PrivacyGate.

CRITICAL FAIL-CLOSED PRINCIPLE:
If any validator check encounters an error, unexpected state, or potential leak,
it MUST fail closed and block the request immediately.
"""

import re
import logging
from typing import Tuple, Optional
from ..models.schemas import SanitizedContextRequest

logger = logging.getLogger("shield_agent.privacy_validator")

def luhn_verify(card_str: str) -> bool:
    """Verifies credit/debit card numbers using the standard Luhn algorithm."""
    digits = [int(c) for c in card_str if c.isdigit()]
    if len(digits) < 13 or len(digits) > 19:
        return False
    checksum = 0
    reverse_digits = digits[::-1]
    for i, digit in enumerate(reverse_digits):
        if i % 2 == 1:
            doubled = digit * 2
            checksum += doubled - 9 if doubled > 9 else doubled
        else:
            checksum += digit
    return checksum % 10 == 0

# Strict regex patterns for post-transmission server-side leak detection
LEAK_PATTERNS = {
    # Standard Card formats: Visa (4), Mastercard (51-55), Amex (34/37), Discover (6011/65)
    "CREDIT_CARD": re.compile(r"\b(?:4[0-9]{12}(?:[0-9]{3})?|5[1-5][0-9]{14}|3[47][0-9]{13}|6(?:011|5[0-9]{2})[0-9]{12})\b"),
    "AADHAAR": re.compile(r"\b[2-9]{1}[0-9]{3}\s?[0-9]{4}\s?[0-9]{4}\b"),
    "PAN_CARD": re.compile(r"\b[A-Z]{5}[0-9]{4}[A-Z]{1}\b"),
    "SSN": re.compile(r"\b(?!000|666|9\d{2})\d{3}[- ](?!00)\d{2}[- ](?!0000)\d{4}\b"),
    "PASSWORD_LEAK": re.compile(r"(?i)\bpassword\s*[:=]\s*['\"]?[^\s,'\"]{4,}['\"]?"),
    "SECRET_LEAK": re.compile(r"(?i)\b(secret|token|api_key|private_key|cvv|pin)\s*[:=]\s*['\"]?[^\s,'\"]{3,}['\"]?"),
    "UPI_ID": re.compile(r"\b[a-zA-Z0-9.\-_]{2,256}@(okhdfcbank|okaxis|oksbi|okicici|paytm|apl|ybl|upi|ibl|axl)\b", re.IGNORECASE),
}

# Any 13-19 digit candidate string tested against Luhn
CARD_CANDIDATE_REGEX = re.compile(r"\b(?:\d{4}[-\s]?){3}\d{1,4}\b|\b\d{13,19}\b")

class ServerPrivacyValidator:
    @staticmethod
    def validate_incoming_context(context: SanitizedContextRequest) -> Tuple[bool, Optional[str]]:
        """
        Validates that the incoming context is legitimately sanitized and contains no raw leaks.
        Returns: (is_valid, rejection_reason)
        """
        try:
            # Rule 1: Check explicit mandatory privacy flags
            if not context.sanitized:
                return False, "REQUEST BLOCKED: 'sanitized' flag is False. Raw context is prohibited."
                
            if not context.privacy_verified:
                return False, "REQUEST BLOCKED: Client PrivacyGate verification is missing or failed."
                
            # Rule 2: Deep inspect DOM summary text for raw sensitive leaks
            if context.dom_summary:
                text_repr = str(context.dom_summary)
                
                # Check regex leak patterns
                for category, pattern in LEAK_PATTERNS.items():
                    match = pattern.search(text_repr)
                    if match:
                        return False, f"SECURITY VIOLATION: Potential raw {category} pattern detected in DOM context."
                
                # Check for Luhn-valid candidate numbers
                for candidate in CARD_CANDIDATE_REGEX.finditer(text_repr):
                    cand_str = candidate.group(0).replace("-", "").replace(" ", "")
                    if luhn_verify(cand_str):
                        return False, "SECURITY VIOLATION: Live valid credit/debit card number detected in DOM context."

            # Rule 3: Inspect any redacted_elements metadata to verify values are NOT present
            for el in context.redacted_elements:
                el_dict = el.model_dump()
                for forbidden_key in ["value", "raw_text", "unmasked", "secret", "password"]:
                    if forbidden_key in el_dict and el_dict[forbidden_key] is not None:
                        return False, f"SECURITY VIOLATION: Forbidden field '{forbidden_key}' found in element metadata."

            # Rule 4: Verify image data URL format if provided
            if context.sanitized_image:
                if not context.sanitized_image.startswith("data:image/"):
                    return False, "SECURITY VIOLATION: Invalid image format in sanitized visual context."

            return True, None

        except Exception as e:
            # FAIL-CLOSED: Any exception in the validator results in an immediate block
            logger.error(f"ServerPrivacyValidator failed closed on error: {e}")
            return False, f"SECURITY PRIVACY GATE FAIL-CLOSED: Validator error encountered ({str(e)}). Request blocked."

    @staticmethod
    def validate_action_safety(action: str, target: str, suggested_params: dict) -> Tuple[bool, Optional[str]]:
        """
        Enforces policy: Typing sensitive credentials must NEVER be requested from the server.
        """
        try:
            action_lower = action.lower()
            if action_lower == "type":
                text_to_type = str(suggested_params.get("text", "")).lower()
                sensitive_keywords = ["password", "secret", "cvv", "pin", "card", "otp", "aadhaar", "pan"]
                for kw in sensitive_keywords:
                    if kw in text_to_type:
                        return False, f"UNSAFE ACTION BLOCKED: Agent attempted to type sensitive credential data ({kw})."
            return True, None
        except Exception as e:
            return False, f"FAIL-CLOSED: Action safety validation error: {str(e)}"
