export type PageId =
  | 'overview'
  | 'livescreen'
  | 'monitor'
  | 'agent'
  | 'performance'
  | 'activity'
  | 'settings'
  | 'profile';

export interface User {
  id: number;
  full_name: string;
  email: string;
  created_at: string;
  is_active: boolean;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export type RedactionMethod = 'blackout' | 'mask' | 'blur' | 'pixelate';

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface DetectedItem {
  id: string;
  category: string;
  confidence: number;
  bbox: BoundingBox;
  redaction: RedactionMethod;
  element_type?: string;
  source?: 'dom' | 'pii' | 'vision';
}

export interface PrivacyEvent {
  id: number;
  timestamp: string;
  category: string;
  confidence: number;
  action: string;
  status: string;
  element_type?: string;
  metadata?: Record<string, any>;
}

export interface SystemMetrics {
  precision: number;
  recall: number;
  f1_score: number;
  redaction_precision: number;
  redaction_recall: number;
  false_positive_rate: number;
  false_negative_rate: number;
  data_reduction_pct: number;
  average_local_inference_time_ms: number;
  average_redaction_time_ms: number;
  average_privacy_validation_time_ms: number;
  average_network_latency_ms: number;
  average_ai_latency_ms: number;
  end_to_end_latency_ms: number;
  cpu_usage_pct: number | null;
  memory_usage_pct: number | null;
  webgpu_status: string;
  total_scanned_screens: number;
  total_sensitive_items_detected: number;
  total_blocked_attempts: number;
  category_distribution: Record<string, number>;
  redaction_distribution: Record<string, number>;
  evaluation_note?: string;
}

export interface StructuredAction {
  action: 'click' | 'scroll' | 'focus' | 'navigate' | 'type' | 'wait';
  target: string;
  confidence: number;
  reason: string;
  suggested_params?: Record<string, any>;
  privacy_verified?: boolean;
  server_latency_ms?: number;
}

export interface TimelineItem {
  id: string;
  timestamp: string;
  title: string;
  description: string;
  status: 'completed' | 'blocked' | 'in-progress' | 'verified';
  category: string;
  metadata?: Record<string, any>;
}

export interface ScanRecord {
  id: number;
  timestamp: string;
  url?: string;
  page_title?: string;
  sanitized_image?: string;
  redacted_items_count: number;
  redacted_elements: Array<{
    category: string;
    confidence: number;
    bbox?: BoundingBox;
    redaction: RedactionMethod;
    element_type?: string;
  }>;
  dom_summary?: Record<string, any>;
  timing_breakdown?: Record<string, number>;
  privacy_gate_status: string;
}

export interface TelemetryHistoryItem {
  id: number;
  time: string;
  local: number;
  redaction: number;
  gate: number;
  network: number;
  ai: number;
  total: number;
  orig_size: number;
  san_size: number;
  reduction_pct: number;
}

export interface TaskHistoryItem {
  id: number;
  timestamp: string;
  task_instruction: string;
  action_type: string;
  action_target: string;
  confidence: number;
  reason: string;
  privacy_gate_verified: boolean;
  redacted_items_count: number;
  total_latency_ms: number;
}

export interface AIConfig {
  provider: string;
  model: string;
  configured: boolean;
  is_real_ai: boolean;
  mode: string;
  status: string;
  message: string;
}

export interface AppSettings {
  localAiEnabled: boolean;
  webgpuEnabled: boolean;
  privacyShieldArmed: boolean;
  autoRedaction: boolean;
  actionConfirmation: boolean;
  serverUrl: string;
  aiProvider: 'mock' | 'gemini' | 'openai';
  theme: 'dark-cyber';
}

export interface AIPrivacyModeState {
  enabled: boolean;
  scanStatus: 'IDLE' | 'SCANNING' | 'COMPLETED' | 'BLOCKED' | 'ERROR';
  detectedCount: number;
  redactedCount: number;
  privacyGateStatus: 'VERIFIED_SAFE' | 'BLOCKED' | 'UNVERIFIED';
  lastScanTimestamp: string | null;
  aiRequestStatus: 'ALLOWED' | 'BLOCKED' | 'CONSENT_REQUIRED';
  unredactedConsentGranted?: boolean;
}

