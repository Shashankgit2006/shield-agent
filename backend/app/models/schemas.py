from typing import List, Optional, Dict, Any, Literal
from pydantic import BaseModel, Field, ConfigDict

# Bounding Box Schema
class BoundingBox(BaseModel):
    x: float
    y: float
    width: float
    height: float

# Detected Item Metadata (NEVER containing sensitive raw values)
class RedactedElementMetadata(BaseModel):
    model_config = ConfigDict(extra="allow")
    category: str = Field(..., description="Category of sensitive data, e.g. PASSWORD, EMAIL, FACE, CARD")
    confidence: float = Field(..., ge=0.0, le=1.0)
    bbox: Optional[BoundingBox] = None
    redaction: str = Field(default="mask", description="Method used: blur, blackout, mask, pixelate")
    element_type: Optional[str] = Field(default="input", description="HTML element tag or visual region")

# Sanitized Screen Context received from extension
class SanitizedContextRequest(BaseModel):
    sanitized: bool = Field(..., description="Must be True. Unsanitized requests are strictly rejected.")
    privacy_verified: bool = Field(..., description="Must be True from PrivacyGate.")
    redacted_items_count: int = Field(default=0)
    redacted_elements: List[RedactedElementMetadata] = Field(default_factory=list)
    sanitized_image: Optional[str] = Field(None, description="Base64 encoded sanitized image (raw image prohibited)")
    dom_summary: Optional[Dict[str, Any]] = Field(default_factory=dict, description="Safe DOM tree metadata without raw PII values")
    url: Optional[str] = None
    page_title: Optional[str] = None
    client_timestamp: Optional[str] = None
    timing_breakdown: Optional[Dict[str, float]] = None
    webgpu_active: Optional[bool] = False

# Task Request from User / Extension
class TaskRequest(BaseModel):
    instruction: str = Field(..., description="User instruction, e.g. 'Find the Submit button and click it.'")
    context: SanitizedContextRequest

# Structured AI Action
ActionType = Literal["click", "scroll", "focus", "navigate", "type", "wait"]

class AIActionResponse(BaseModel):
    action: ActionType
    target: str = Field(..., description="Element selector or text identifier, e.g. 'Submit'")
    confidence: float = Field(..., ge=0.0, le=1.0)
    reason: str = Field(..., description="Justification for the action")
    suggested_params: Optional[Dict[str, Any]] = Field(default_factory=dict)
    privacy_verified: bool = True
    server_latency_ms: float = 0.0

# Privacy Gate verification response
class PrivacyGateResult(BaseModel):
    allowed: bool
    sanitized: bool
    reason: Optional[str] = None
    violation_category: Optional[str] = None

# Privacy Event response for Monitor
class PrivacyEventItem(BaseModel):
    id: int
    timestamp: str
    category: str
    confidence: float
    action: str
    status: str
    element_type: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None

# Performance and Privacy Metrics
class PerformanceMetrics(BaseModel):
    precision: float
    recall: float
    f1_score: float
    redaction_precision: float
    redaction_recall: float
    false_positive_rate: float
    false_negative_rate: float
    data_reduction_pct: float
    average_local_inference_time_ms: float
    average_redaction_time_ms: float
    average_privacy_validation_time_ms: float
    average_network_latency_ms: float
    average_ai_latency_ms: float
    end_to_end_latency_ms: float
    cpu_usage_pct: Optional[float] = None
    memory_usage_pct: Optional[float] = None
    webgpu_status: str
    total_scanned_screens: int
    total_sensitive_items_detected: int
    total_blocked_attempts: int
    category_distribution: Dict[str, int]
    redaction_distribution: Dict[str, int]
    evaluation_note: Optional[str] = None

# Scan Record schema for real screen inspection
class ScanRecord(BaseModel):
    id: int
    timestamp: str
    url: Optional[str] = None
    page_title: Optional[str] = None
    sanitized_image: Optional[str] = None
    redacted_items_count: int = 0
    redacted_elements: List[RedactedElementMetadata] = Field(default_factory=list)
    dom_summary: Optional[Dict[str, Any]] = Field(default_factory=dict)
    timing_breakdown: Optional[Dict[str, float]] = None
    privacy_gate_status: str = "VERIFIED_SAFE"

# Telemetry History Item for Timeseries Charts
class TelemetryHistoryItem(BaseModel):
    id: int
    time: str
    local: float
    redaction: float
    gate: float
    network: float
    ai: float
    total: float
    orig_size: int
    san_size: int
    reduction_pct: float

# Task History Item for Activity Page
class TaskHistoryItem(BaseModel):
    id: int
    timestamp: str
    task_instruction: str
    action_type: str
    action_target: str
    confidence: float
    reason: str
    privacy_gate_verified: bool
    redacted_items_count: int
    total_latency_ms: float

# AI Provider Configuration Status
class AIConfigResponse(BaseModel):
    provider: str
    model: str
    configured: bool
    is_real_ai: bool
    mode: str
    status: str
    message: str

class AIConfigRequest(BaseModel):
    provider: str = Field(..., description="mock, gemini, or openai")
    api_key: Optional[str] = None
    model: Optional[str] = None

