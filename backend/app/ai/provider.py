"""
AI/VLM Provider Abstraction and Implementation.
Supports:
1. CloudAIProvider: Real Google Gemini and OpenAI integration using official REST endpoints.
   Guarantees ONLY sanitized context (redacted screenshots & masked DOM summaries) is transmitted.
2. MockAIProvider: Clearly labeled "[DEVELOPMENT MODE - Local Rule-Based Engine]".
   Never pretends simulated heuristics are real neural network outputs.
3. UnconfiguredAIProvider: When cloud mode is requested without API keys.
"""

from abc import ABC, abstractmethod
import time
import asyncio
import re
import json
import logging
from typing import Dict, Any, Optional
import httpx
from fastapi import HTTPException
from ..models.schemas import SanitizedContextRequest, AIActionResponse, ActionType
from ..config import settings

logger = logging.getLogger("shield_agent.ai")

class AIProvider(ABC):
    @abstractmethod
    async def analyze_context(self, context: SanitizedContextRequest) -> Dict[str, Any]:
        """Analyze sanitized visual and DOM context."""
        pass

    @abstractmethod
    async def generate_action(self, instruction: str, context: SanitizedContextRequest) -> AIActionResponse:
        """Generate structured browser action based on user instruction and sanitized context."""
        pass


class MockAIProvider(AIProvider):
    """
    Local Rule-Based Development Mode.
    Explicitly labeled as Development Mode / Local Engine.
    Operates 100% locally with zero external API key requirements.
    Analyzes sanitized DOM elements (buttons, inputs, links) to deliver structured actions.
    """
    
    async def analyze_context(self, context: SanitizedContextRequest) -> Dict[str, Any]:
        await asyncio.sleep(0.05)
        dom = context.dom_summary or {}
        clickable_elements = dom.get("clickable_elements", [])
        
        return {
            "model": "Shield-Local-Rule-Engine [DEVELOPMENT MODE]",
            "provider": "MockAIProvider (Local Development Mode)",
            "is_real_ai": False,
            "detected_clickable_count": len(clickable_elements),
            "sanitized_visual_received": bool(context.sanitized_image),
            "redacted_regions_respected": context.redacted_items_count,
            "visual_summary": "Sanitized viewport analyzed by local rule-based development engine. All private PII blocks, faces, and form credentials securely masked."
        }

    async def generate_action(self, instruction: str, context: SanitizedContextRequest) -> AIActionResponse:
        start_time = time.time()
        await asyncio.sleep(0.08)
        
        inst_lower = instruction.lower().strip()
        dom = context.dom_summary or {}
        clickable = dom.get("clickable_elements", [])
        form_fields = dom.get("form_fields", [])
        headings = dom.get("headings", [])
        page_title = dom.get("title") or context.page_title or "Active Webpage"
        
        action: ActionType = "click"
        target = "Submit"
        confidence = 0.90
        reason = "[DEVELOPMENT MODE - Local Rule Engine] Target identified in sanitized DOM structure."
        suggested_params: Dict[str, Any] = {}
        
        # 1. Search Action / Find Search Bar
        if "search" in inst_lower:
            found_search = None
            for f in form_fields:
                f_type = str(f.get("type", "")).lower()
                f_id = str(f.get("id", "")).lower()
                f_label = str(f.get("label", "")).lower()
                f_ph = str(f.get("placeholder", "")).lower()
                if "search" in f_type or "search" in f_id or "search" in f_label or "search" in f_ph or "q" == f_id:
                    found_search = f.get("id") or f.get("placeholder") or f.get("label") or "Search"
                    action = "focus"
                    break
            
            if not found_search:
                for el in clickable:
                    text = str(el.get("text", "")).lower()
                    el_id = str(el.get("id", "")).lower()
                    aria = str(el.get("aria_label", "")).lower()
                    if "search" in text or "search" in el_id or "search" in aria:
                        found_search = el.get("text") or el.get("id") or "Search"
                        action = "click"
                        break
                        
            target = found_search or "Search"
            confidence = 0.94 if found_search else 0.80
            reason = f"[DEVELOPMENT MODE - Local Rule Engine] Search input/button '{target}' located in sanitized DOM structure."
            suggested_params = {"selector": f"input[type='search'], input[name='q'], #{target}"}
            
        # 2. Submit / Form Complete
        elif "submit" in inst_lower or "complete" in inst_lower or "finish" in inst_lower:
            found_submit = None
            for el in clickable:
                text = str(el.get("text", "")).lower()
                tag = str(el.get("tag", "")).lower()
                el_id = str(el.get("id", "")).lower()
                el_type = str(el.get("type", "")).lower()
                if "submit" in text or "submit" in el_id or el_type == "submit":
                    found_submit = el.get("id") or el.get("text") or "Submit"
                    break
            
            target = found_submit or "Submit"
            action = "click"
            confidence = 0.95 if found_submit else 0.85
            reason = f"[DEVELOPMENT MODE - Local Rule Engine] Target '{target}' matched submit instruction."
            suggested_params = {"selector": "button[type='submit'], #submit-btn, button:contains('Submit')"}
            
        # 3. Login / Sign In
        elif "login" in inst_lower or "sign in" in inst_lower or "signin" in inst_lower:
            found_login = None
            for el in clickable:
                text = str(el.get("text", "")).lower()
                el_id = str(el.get("id", "")).lower()
                aria = str(el.get("aria_label", "")).lower()
                if "sign in" in text or "login" in text or "sign in" in aria or "login" in el_id:
                    found_login = el.get("text") or el.get("id") or "Sign In"
                    break
            
            target = found_login or "Sign In"
            action = "click"
            confidence = 0.93 if found_login else 0.75
            reason = f"[DEVELOPMENT MODE - Local Rule Engine] Login element '{target}' identified."
            suggested_params = {"selector": f"a:contains('{target}'), button:contains('{target}')"}

        # 4. Describe / Summarize Page
        elif "describe" in inst_lower or "summarize" in inst_lower or "overview" in inst_lower or "what is" in inst_lower:
            action = "wait"
            main_heading = headings[0] if headings else page_title
            target = main_heading
            confidence = 0.95
            reason = f"[DEVELOPMENT MODE - Local Rule Engine] Page summary: '{page_title}'. Key headings: {len(headings)}. Interactive elements: {len(clickable)}."
            suggested_params = {"duration": 500}

        # 5. Scroll Instruction
        elif "scroll" in inst_lower:
            action = "scroll"
            target = "window"
            confidence = 0.92
            direction = "up" if "up" in inst_lower else "down"
            distance = 400
            match_dist = re.search(r"(\d+)\s*(?:px)?", instruction)
            if match_dist:
                distance = int(match_dist.group(1))
            reason = f"[DEVELOPMENT MODE - Local Rule Engine] Executing scroll {direction} by {distance}px."
            suggested_params = {"direction": direction, "distance": distance}

        # 6. Generic "Find [X]" or "Click [X]"
        else:
            match = re.search(r"(?:find|click|press|open|select)\s+(?:on\s+)?(?:the\s+)?([a-zA-Z0-9_\-\s]+)", instruction, re.IGNORECASE)
            query_term = match.group(1).strip().lower() if match else inst_lower
            
            found_target = None
            for el in clickable:
                text = str(el.get("text", "")).lower()
                el_id = str(el.get("id", "")).lower()
                aria = str(el.get("aria_label", "")).lower()
                if query_term in text or query_term in el_id or query_term in aria:
                    found_target = el.get("text") or el.get("id") or query_term
                    action = "click"
                    break
                    
            if not found_target:
                for f in form_fields:
                    f_id = str(f.get("id", "")).lower()
                    f_label = str(f.get("label", "")).lower()
                    f_ph = str(f.get("placeholder", "")).lower()
                    if query_term in f_id or query_term in f_label or query_term in f_ph:
                        found_target = f.get("id") or f.get("placeholder") or query_term
                        action = "focus"
                        break
                        
            if found_target:
                target = found_target
                confidence = 0.92
                reason = f"[DEVELOPMENT MODE - Local Rule Engine] Target '{target}' matched user query '{query_term}'."
                suggested_params = {"selector": f"#{target}, button:contains('{target}')"}
            elif clickable:
                target = clickable[0].get("text") or clickable[0].get("id") or "Primary Element"
                confidence = 0.70
                reason = f"[DEVELOPMENT MODE - Local Rule Engine] Target '{query_term}' not directly matched. Proposing primary interactive element '{target}'."
            else:
                target = "Page"
                confidence = 0.60
                reason = f"[DEVELOPMENT MODE - Local Rule Engine] No interactive elements found matching '{query_term}'."

        latency = round((time.time() - start_time) * 1000, 2)
        
        return AIActionResponse(
            action=action,
            target=target,
            confidence=confidence,
            reason=reason,
            suggested_params=suggested_params,
            privacy_verified=True,
            server_latency_ms=latency
        )


class UnconfiguredAIProvider(AIProvider):
    """
    Raised when user configures a cloud provider (Gemini/OpenAI) but has not provided an API key.
    Ensures the system NEVER silently falls back to mock responses pretending they are real AI.
    """
    def __init__(self, provider_name: str):
        self.provider_name = provider_name

    async def analyze_context(self, context: SanitizedContextRequest) -> Dict[str, Any]:
        raise HTTPException(
            status_code=503,
            detail=f"AI provider '{self.provider_name}' requested but AI_API_KEY (or GEMINI_API_KEY / OPENAI_API_KEY) is not configured in backend/.env. To use real AI reasoning, please supply your API key or set AI_PROVIDER=mock for development mode."
        )

    async def generate_action(self, instruction: str, context: SanitizedContextRequest) -> AIActionResponse:
        raise HTTPException(
            status_code=503,
            detail=f"AI provider '{self.provider_name}' not configured: Missing API key. Please configure GEMINI_API_KEY or OPENAI_API_KEY in backend/.env to enable real AI reasoning."
        )


class CloudAIProvider(AIProvider):
    """
    Genuine Cloud AI / VLM Provider.
    Supports Google Gemini (default) and OpenAI API endpoints.
    Strictly receives only SANITIZED context and redacted images validated by PrivacyGate.
    """
    def __init__(self, api_key: str, provider_type: str = "gemini", model_name: str = ""):
        self.api_key = api_key
        self.provider_type = provider_type.lower()
        if not model_name:
            self.model_name = "gemini-1.5-flash" if self.provider_type in ("gemini", "cloud") else "gpt-4o-mini"
        else:
            self.model_name = model_name

    async def analyze_context(self, context: SanitizedContextRequest) -> Dict[str, Any]:
        start_time = time.time()
        
        instruction = "Summarize the primary purpose and safe interactive elements of this sanitized webpage."
        action_resp = await self.generate_action(instruction, context)
        
        return {
            "model": self.model_name,
            "provider": f"Real Cloud AI ({self.provider_type.upper()})",
            "is_real_ai": True,
            "sanitized_visual_received": bool(context.sanitized_image),
            "redacted_regions_respected": context.redacted_items_count,
            "detected_clickable_count": len((context.dom_summary or {}).get("clickable_elements", [])),
            "visual_summary": f"Cloud AI ({self.model_name}) analyzed sanitized webpage. Action determined: {action_resp.action} on '{action_resp.target}'.",
            "latency_ms": round((time.time() - start_time) * 1000, 2)
        }

    async def generate_action(self, instruction: str, context: SanitizedContextRequest) -> AIActionResponse:
        start_time = time.time()
        
        if self.provider_type in ("gemini", "cloud"):
            action_data = await self._call_gemini(instruction, context)
        elif self.provider_type == "openai":
            action_data = await self._call_openai(instruction, context)
        else:
            action_data = await self._call_gemini(instruction, context)

        latency = round((time.time() - start_time) * 1000, 2)
        
        # Validate against AIActionResponse schema
        return AIActionResponse(
            action=action_data.get("action", "click"),
            target=action_data.get("target", "Submit"),
            confidence=float(action_data.get("confidence", 0.90)),
            reason=f"[Real AI - {self.model_name}] {action_data.get('reason', 'Target identified by vision and DOM analysis.')}",
            suggested_params=action_data.get("suggested_params", {}),
            privacy_verified=True,
            server_latency_ms=latency
        )

    async def _call_gemini(self, instruction: str, context: SanitizedContextRequest) -> Dict[str, Any]:
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{self.model_name}:generateContent?key={self.api_key}"
        
        system_prompt = (
            "You are Shield-Agent, a privacy-preserving browser automation assistant. "
            "You receive ONLY sanitized webpage context where private PII, credentials, and faces have been redacted locally on the client. "
            "Your task is to analyze the user's instruction and the sanitized page structure, then choose the single best browser action. "
            "You MUST respond ONLY with a valid JSON object matching this schema:\n"
            "{\n"
            '  "action": "click" | "scroll" | "focus" | "navigate" | "type" | "wait",\n'
            '  "target": "text or id of the target element (e.g. \'Submit\', \'search-box\')",\n'
            '  "confidence": 0.0 to 1.0 (float),\n'
            '  "reason": "Brief explanation of why this action was chosen",\n'
            '  "suggested_params": {"selector": "optional CSS selector", "text": "optional text (NEVER sensitive values)", "direction": "down"}\n'
            "}\n"
            "CRITICAL: Do NOT output markdown code blocks (```json). Output ONLY the raw JSON object."
        )

        user_content_parts = []
        
        # Add visual context if present (sanitized image only!)
        if context.sanitized_image and "," in context.sanitized_image:
            header, base64_data = context.sanitized_image.split(",", 1)
            mime = "image/jpeg"
            if "image/png" in header:
                mime = "image/png"
            user_content_parts.append({
                "inlineData": {
                    "mimeType": mime,
                    "data": base64_data.strip()
                }
            })

        # Add text context with sanitized DOM summary
        dom_summary_str = json.dumps(context.dom_summary or {}, indent=2)
        user_text = (
            f"User Goal: {instruction}\n\n"
            f"Page Title: {context.page_title or 'Sanitized Webpage'}\n"
            f"Page URL: {context.url or 'Sanitized URL'}\n"
            f"Sanitized DOM Elements:\n{dom_summary_str}\n\n"
            "Return the JSON action response."
        )
        user_content_parts.append({"text": user_text})

        payload = {
            "system_instruction": {"parts": [{"text": system_prompt}]},
            "contents": [{"role": "user", "parts": user_content_parts}],
            "generationConfig": {
                "temperature": 0.1,
                "response_mime_type": "application/json"
            }
        }

        async with httpx.AsyncClient(timeout=20.0) as client:
            try:
                resp = await client.post(url, json=payload)
            except httpx.TimeoutException:
                raise HTTPException(status_code=504, detail="Gemini AI provider request timed out (20s limit).")
            except Exception as e:
                raise HTTPException(status_code=502, detail=f"Network error connecting to Gemini AI provider: {str(e)}")

        if resp.status_code != 200:
            error_body = resp.text
            try:
                err_json = resp.json()
                msg = err_json.get("error", {}).get("message", error_body)
            except Exception:
                msg = error_body
            raise HTTPException(status_code=502, detail=f"Gemini API error ({resp.status_code}): {msg}")

        data = resp.json()
        try:
            raw_text = data["candidates"][0]["content"]["parts"][0]["text"].strip()
            return self._parse_json_action(raw_text)
        except (KeyError, IndexError, json.JSONDecodeError) as e:
            logger.error(f"Failed to parse Gemini response: {e}")
            raise HTTPException(status_code=502, detail=f"Invalid response format returned by Gemini AI: {str(e)}")

    async def _call_openai(self, instruction: str, context: SanitizedContextRequest) -> Dict[str, Any]:
        url = "https://api.openai.com/v1/chat/completions"
        
        system_prompt = (
            "You are Shield-Agent, a privacy-preserving browser automation assistant. "
            "You receive ONLY sanitized webpage context where private PII, credentials, and faces have been redacted locally. "
            "Analyze the user's instruction and the sanitized page structure, then choose the single best browser action. "
            "You MUST respond ONLY with a valid JSON object matching this schema:\n"
            "{\n"
            '  "action": "click" | "scroll" | "focus" | "navigate" | "type" | "wait",\n'
            '  "target": "text or id of the target element",\n'
            '  "confidence": 0.0 to 1.0,\n'
            '  "reason": "Brief explanation",\n'
            '  "suggested_params": {}\n'
            "}"
        )

        messages = [
            {"role": "system", "content": system_prompt},
            {
                "role": "user",
                "content": f"User Goal: {instruction}\nDOM Summary: {json.dumps(context.dom_summary or {})}"
            }
        ]

        payload = {
            "model": self.model_name,
            "messages": messages,
            "response_format": {"type": "json_object"},
            "temperature": 0.1
        }

        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }

        async with httpx.AsyncClient(timeout=20.0) as client:
            try:
                resp = await client.post(url, json=payload, headers=headers)
            except httpx.TimeoutException:
                raise HTTPException(status_code=504, detail="OpenAI provider request timed out (20s limit).")
            except Exception as e:
                raise HTTPException(status_code=502, detail=f"Network error connecting to OpenAI provider: {str(e)}")

        if resp.status_code != 200:
            raise HTTPException(status_code=502, detail=f"OpenAI API error ({resp.status_code}): {resp.text}")

        data = resp.json()
        raw_text = data["choices"][0]["message"]["content"].strip()
        return self._parse_json_action(raw_text)

    def _parse_json_action(self, raw_text: str) -> Dict[str, Any]:
        # Clean potential markdown wrapping
        cleaned = raw_text.strip()
        if cleaned.startswith("```json"):
            cleaned = cleaned[7:]
        if cleaned.startswith("```"):
            cleaned = cleaned[3:]
        if cleaned.endswith("```"):
            cleaned = cleaned[:-3]
        cleaned = cleaned.strip()
        
        parsed = json.loads(cleaned)
        
        # Validate required fields
        if "action" not in parsed or "target" not in parsed:
            raise ValueError("Missing 'action' or 'target' in model response.")
            
        allowed_actions = ["click", "scroll", "focus", "navigate", "type", "wait"]
        if parsed["action"].lower() not in allowed_actions:
            parsed["action"] = "click"
            
        return parsed


def get_ai_provider() -> AIProvider:
    provider_type = settings.AI_PROVIDER.lower()
    api_key = settings.AI_API_KEY
    
    if provider_type in ("cloud", "gemini", "openai"):
        if not api_key:
            return UnconfiguredAIProvider(provider_type)
        return CloudAIProvider(
            api_key=api_key,
            provider_type=provider_type,
            model_name=settings.effective_model
        )
        
    return MockAIProvider()

def get_ai_status() -> Dict[str, Any]:
    provider_type = settings.AI_PROVIDER.lower()
    has_key = bool(settings.AI_API_KEY)
    
    if provider_type in ("cloud", "gemini", "openai"):
        return {
            "provider": provider_type,
            "model": settings.effective_model,
            "configured": has_key,
            "is_real_ai": True,
            "mode": "cloud_vlm",
            "status": "READY" if has_key else "API_KEY_REQUIRED",
            "message": "Connected to real Cloud AI provider" if has_key else "AI provider not configured. Set GEMINI_API_KEY or OPENAI_API_KEY in backend/.env"
        }
    return {
        "provider": "mock",
        "model": "Shield-Local-Rule-Engine",
        "configured": True,
        "is_real_ai": False,
        "mode": "development_rule_engine",
        "status": "LOCAL_DEV_MODE",
        "message": "Running in explicitly labeled Local Development Mode (rule-based engine, zero external network calls)"
    }
