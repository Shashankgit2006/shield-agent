"""
Shield-Agent Protected API Routes.
All agent, analysis, telemetry, and privacy audit endpoints enforce
production authentication checks via Depends(get_current_user).
"""

from fastapi import APIRouter, HTTPException, Query, Depends
from typing import Dict, Any, List, Optional
from ..models.schemas import (
    SanitizedContextRequest,
    TaskRequest,
    AIActionResponse,
    PerformanceMetrics,
    PrivacyEventItem,
    ScanRecord,
    TelemetryHistoryItem,
    TaskHistoryItem,
    AIConfigResponse,
    AIConfigRequest
)
from ..models.user import User
from .auth_deps import get_current_user
from ..services.agent_service import AgentService
from ..services.metrics_service import MetricsService
from ..database import (
    get_recent_privacy_events,
    get_latest_scan,
    get_telemetry_history,
    get_tasks_history,
    record_scan
)
from ..ai.provider import get_ai_status
from ..config import settings

router = APIRouter(prefix="/api")

@router.get("/health", response_model=Dict[str, Any])
async def health_check():
    """System health check and privacy shield status (Public)."""
    ai_status = get_ai_status()
    return {
        "status": "healthy",
        "shield_agent": "active",
        "privacy_gate": "enforced",
        "version": settings.VERSION,
        "ai_provider": settings.AI_PROVIDER,
        "ai_status": ai_status,
        "auth_system": "active",
        "message": "Shield-Agent Backend active. Raw sensitive data transmission strictly forbidden."
    }

@router.get("/ai/config", response_model=AIConfigResponse)
async def get_ai_configuration():
    """Returns AI provider configuration and readiness status."""
    return get_ai_status()

@router.post("/ai/config", response_model=AIConfigResponse)
async def update_ai_configuration(
    payload: AIConfigRequest,
    current_user: User = Depends(get_current_user)
):
    """
    Updates the active AI Provider and API key dynamically at runtime.
    Allows seamlessly toggling between MockAIProvider (local rule engine), Google Gemini, and OpenAI.
    """
    settings.set_ai_config(
        provider=payload.provider,
        api_key=payload.api_key or "",
        model=payload.model or ""
    )
    return get_ai_status()


@router.post("/analyze", response_model=Dict[str, Any])
async def analyze_screen(
    context: SanitizedContextRequest,
    current_user: User = Depends(get_current_user)
):
    """
    Ingests SANITIZED screen context and returns VLM/LLM perception metadata.
    Protected: Requires authenticated user session.
    Strictly rejects any request with sanitized=False or privacy_verified=False.
    """
    return await AgentService.analyze_screen_context(context)

@router.post("/task", response_model=AIActionResponse)
async def execute_task(
    task_request: TaskRequest,
    current_user: User = Depends(get_current_user)
):
    """
    Receives user goal and sanitized context.
    Returns structured browser action for local execution by the Chrome Extension.
    Protected: Requires authenticated user session.
    """
    return await AgentService.process_task(task_request)

@router.get("/metrics", response_model=PerformanceMetrics)
async def get_system_metrics(
    current_user: User = Depends(get_current_user)
):
    """
    Returns real privacy accuracy, latency telemetry,
    and data reduction metrics for the Cybersecurity Dashboard.
    Protected: Requires authenticated user session.
    """
    return MetricsService.get_metrics()

@router.get("/privacy-events", response_model=List[PrivacyEventItem])
async def get_privacy_events(
    limit: int = Query(50, ge=1, le=200),
    current_user: User = Depends(get_current_user)
):
    """
    Returns recent privacy defense events.
    Protected: Requires authenticated user session.
    Guaranteed: Contains zero raw sensitive values.
    """
    events = get_recent_privacy_events(limit=limit)
    return events

@router.get("/scans/latest", response_model=Optional[ScanRecord])
async def get_latest_scan_record(
    current_user: User = Depends(get_current_user)
):
    """
    Returns the most recent sanitized screen scan for the Live Screen Inspector.
    Protected: Requires authenticated user session.
    """
    scan = get_latest_scan()
    return scan

@router.post("/scans", response_model=Dict[str, Any])
async def save_scan_record(
    context: SanitizedContextRequest,
    current_user: User = Depends(get_current_user)
):
    """
    Saves a sanitized scan record directly from client / extension.
    Protected: Requires authenticated user session.
    """
    scan_id = record_scan(
        url=context.url or "",
        page_title=context.page_title or "Sanitized Page",
        sanitized_image=context.sanitized_image or "",
        redacted_items_count=context.redacted_items_count,
        redacted_elements=[el.model_dump() for el in context.redacted_elements],
        dom_summary=context.dom_summary or {},
        timing=context.timing_breakdown or {},
        status="VERIFIED_SAFE"
    )
    return {"success": True, "scan_id": scan_id}

@router.get("/telemetry/history", response_model=List[TelemetryHistoryItem])
async def get_telemetry_history_records(
    limit: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_user)
):
    """
    Returns real historical latency and telemetry measurements for the Performance charts.
    Protected: Requires authenticated user session.
    """
    return get_telemetry_history(limit=limit)

@router.get("/tasks/history", response_model=List[TaskHistoryItem])
async def get_tasks_history_records(
    limit: int = Query(50, ge=1, le=200),
    current_user: User = Depends(get_current_user)
):
    """
    Returns real executed task history for the Activity timeline.
    Protected: Requires authenticated user session.
    """
    return get_tasks_history(limit=limit)
