/**
 * Shield-Agent Frontend API Client
 * Connects to FastAPI backend (default: http://localhost:8000).
 * Guarantees zero fabricated metrics or hardcoded mock fallbacks.
 */

import {
  SystemMetrics,
  PrivacyEvent,
  StructuredAction,
  ScanRecord,
  TelemetryHistoryItem,
  TaskHistoryItem,
  AIConfig
} from '../types';

let currentServerUrl = 'http://localhost:8000';

export function setApiBaseUrl(url: string) {
  currentServerUrl = url.replace(/\/+$/, '');
}

export function getApiBaseUrl(): string {
  return currentServerUrl;
}

function getAuthHeaders(): Record<string, string> {
  const token = localStorage.getItem('shield_auth_token') || sessionStorage.getItem('shield_auth_token');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

export async function fetchHealth(): Promise<{ status: string; shield_agent: string; ai_provider: string; ai_status?: AIConfig }> {
  const res = await fetch(`${currentServerUrl}/api/health`, { method: 'GET' });
  if (!res.ok) throw new Error(`Health check failed: HTTP ${res.status}`);
  return await res.json();
}

export async function fetchAiConfig(): Promise<AIConfig> {
  const res = await fetch(`${currentServerUrl}/api/ai/config`, { method: 'GET' });
  if (!res.ok) throw new Error(`AI configuration fetch failed: HTTP ${res.status}`);
  return await res.json();
}

export async function fetchMetrics(): Promise<SystemMetrics> {
  const res = await fetch(`${currentServerUrl}/api/metrics`, {
    method: 'GET',
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error(`Failed to fetch metrics: HTTP ${res.status}`);
  return await res.json();
}

export async function fetchPrivacyEvents(limit = 50): Promise<PrivacyEvent[]> {
  const res = await fetch(`${currentServerUrl}/api/privacy-events?limit=${limit}`, {
    method: 'GET',
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error(`Failed to fetch privacy events: HTTP ${res.status}`);
  return await res.json();
}

export async function fetchLatestScan(): Promise<ScanRecord | null> {
  const res = await fetch(`${currentServerUrl}/api/scans/latest`, {
    method: 'GET',
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error(`Failed to fetch latest scan: HTTP ${res.status}`);
  return await res.json();
}

export async function fetchTelemetryHistory(limit = 20): Promise<TelemetryHistoryItem[]> {
  const res = await fetch(`${currentServerUrl}/api/telemetry/history?limit=${limit}`, {
    method: 'GET',
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error(`Failed to fetch telemetry history: HTTP ${res.status}`);
  return await res.json();
}

export async function fetchTasksHistory(limit = 50): Promise<TaskHistoryItem[]> {
  const res = await fetch(`${currentServerUrl}/api/tasks/history?limit=${limit}`, {
    method: 'GET',
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error(`Failed to fetch tasks history: HTTP ${res.status}`);
  return await res.json();
}

export async function analyzeSanitizedContext(sanitizedPayload: any): Promise<any> {
  const res = await fetch(`${currentServerUrl}/api/analyze`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(sanitizedPayload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || `Analysis rejected: HTTP ${res.status}`);
  }
  return await res.json();
}

export async function sendTask(instruction: string, sanitizedPayload: any): Promise<StructuredAction> {
  const res = await fetch(`${currentServerUrl}/api/task`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({
      instruction,
      context: sanitizedPayload,
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || `Task execution failed: HTTP ${res.status}`);
  }
  return await res.json();
}

export async function saveScanRecord(scanData: any): Promise<{ success: boolean; scan_id: number }> {
  const res = await fetch(`${currentServerUrl}/api/scans`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(scanData),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || `Failed to save scan: HTTP ${res.status}`);
  }
  return await res.json();
}

export async function saveAiConfig(config: { provider: string; api_key?: string; model?: string }): Promise<AIConfig> {
  const res = await fetch(`${currentServerUrl}/api/ai/config`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(config),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || `Failed to update AI config: HTTP ${res.status}`);
  }
  return await res.json();
}

