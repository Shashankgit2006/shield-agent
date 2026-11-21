"""
Database initialization and privacy-safe storage.
Integrates SQLAlchemy ORM for User & Token Authentication,
along with privacy-safe telemetry and activity tables.

CRITICAL SECURITY RULE:
Only privacy-safe metadata, anonymized telemetry, and hashed user credentials are stored.
Raw passwords, unredacted screenshots, and private screen contents are NEVER stored.
"""

import sqlite3
import json
import time
from pathlib import Path
from typing import Dict, Any, List, Optional, Generator
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from .models.user import Base, User
from .services.auth_security import hash_password
from .config import settings

DB_PATH = Path(__file__).resolve().parent.parent / "shield_agent.db"
SQLALCHEMY_DATABASE_URL = settings.DATABASE_URL

# SQLAlchemy Setup
engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False} if "sqlite" in SQLALCHEMY_DATABASE_URL else {}
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_db() -> Generator[Session, None, None]:
    """FastAPI Dependency providing SQLAlchemy database session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def seed_demo_user():
    """Seeds the development demo user if demo account is enabled."""
    if not settings.DEMO_ACCOUNT_ENABLED:
        return
        
    db = SessionLocal()
    try:
        existing = db.query(User).filter(User.email == settings.DEMO_USER_EMAIL).first()
        if not existing:
            demo_user = User(
                full_name=settings.DEMO_USER_NAME,
                email=settings.DEMO_USER_EMAIL,
                password_hash=hash_password(settings.DEMO_USER_PASSWORD),
                is_active=True
            )
            db.add(demo_user)
            db.commit()
            print(f"[Shield-Agent Auth] Demo user seeded: {settings.DEMO_USER_EMAIL} (DEVELOPMENT ONLY)")
    except Exception as e:
        db.rollback()
        print(f"[Shield-Agent Auth] Warning seeding demo user: {e}")
    finally:
        db.close()

def get_connection() -> sqlite3.Connection:
    """Standard sqlite3 connection for privacy events, scans, and telemetry."""
    conn = sqlite3.connect(str(DB_PATH), check_same_thread=False)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    # 1. Create SQLAlchemy ORM tables (users, password_reset_tokens)
    Base.metadata.create_all(bind=engine)
    
    # 2. Seed development demo user
    seed_demo_user()

    # 3. Privacy-safe SQLite tables
    conn = get_connection()
    cursor = conn.cursor()
    
    # Privacy Events table (No raw values stored!)
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS privacy_events (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            timestamp TEXT NOT NULL,
            category TEXT NOT NULL,
            confidence REAL NOT NULL,
            action TEXT NOT NULL,
            status TEXT NOT NULL,
            element_type TEXT,
            metadata_json TEXT
        )
    """)
    
    # Task executions table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS tasks (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            timestamp TEXT NOT NULL,
            task_instruction TEXT NOT NULL,
            action_type TEXT NOT NULL,
            action_target TEXT NOT NULL,
            confidence REAL NOT NULL,
            reason TEXT NOT NULL,
            privacy_gate_verified INTEGER NOT NULL,
            redacted_items_count INTEGER NOT NULL,
            total_latency_ms REAL NOT NULL
        )
    """)
    
    # Performance telemetry table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS telemetry (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            timestamp TEXT NOT NULL,
            local_inference_ms REAL NOT NULL,
            redaction_ms REAL NOT NULL,
            privacy_validation_ms REAL NOT NULL,
            network_ms REAL NOT NULL,
            ai_latency_ms REAL NOT NULL,
            total_latency_ms REAL NOT NULL,
            cpu_usage REAL,
            memory_usage REAL,
            webgpu_available INTEGER NOT NULL,
            original_size_bytes INTEGER NOT NULL,
            sanitized_size_bytes INTEGER NOT NULL,
            data_reduction_pct REAL NOT NULL
        )
    """)
    
    # Real Scan Sessions table (stores only sanitized representations)
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS scans (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            timestamp TEXT NOT NULL,
            url TEXT,
            page_title TEXT,
            sanitized_image TEXT,
            redacted_items_count INTEGER NOT NULL,
            redacted_elements_json TEXT,
            dom_summary_json TEXT,
            timing_json TEXT,
            privacy_gate_status TEXT NOT NULL
        )
    """)
    
    conn.commit()
    conn.close()

def log_privacy_event(category: str, confidence: float, action: str, status: str, element_type: str = "element", metadata: Dict[str, Any] = None):
    conn = get_connection()
    cursor = conn.cursor()
    now_str = time.strftime("%H:%M:%S")
    cursor.execute("""
        INSERT INTO privacy_events (timestamp, category, confidence, action, status, element_type, metadata_json)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    """, (now_str, category.upper(), confidence, action.upper(), status.upper(), element_type, json.dumps(metadata or {})))
    conn.commit()
    conn.close()

def get_recent_privacy_events(limit: int = 50) -> List[Dict[str, Any]]:
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT id, timestamp, category, confidence, action, status, element_type, metadata_json
        FROM privacy_events
        ORDER BY id DESC
        LIMIT ?
    """, (limit,))
    rows = cursor.fetchall()
    conn.close()
    return [
        {
            "id": row["id"],
            "timestamp": row["timestamp"],
            "category": row["category"],
            "confidence": row["confidence"],
            "action": row["action"],
            "status": row["status"],
            "element_type": row["element_type"],
            "metadata": json.loads(row["metadata_json"] or "{}")
        }
        for row in rows
    ]

def record_task_execution(task_instruction: str, action_type: str, action_target: str, confidence: float, reason: str, privacy_gate_verified: bool, redacted_items_count: int, total_latency_ms: float):
    conn = get_connection()
    cursor = conn.cursor()
    now_str = time.strftime("%Y-%m-%d %H:%M:%S")
    cursor.execute("""
        INSERT INTO tasks (timestamp, task_instruction, action_type, action_target, confidence, reason, privacy_gate_verified, redacted_items_count, total_latency_ms)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (now_str, task_instruction, action_type, action_target, confidence, reason, 1 if privacy_gate_verified else 0, redacted_items_count, total_latency_ms))
    conn.commit()
    conn.close()

def get_tasks_history(limit: int = 50) -> List[Dict[str, Any]]:
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT id, timestamp, task_instruction, action_type, action_target, confidence, reason, privacy_gate_verified, redacted_items_count, total_latency_ms
        FROM tasks
        ORDER BY id DESC
        LIMIT ?
    """, (limit,))
    rows = cursor.fetchall()
    conn.close()
    return [
        {
            "id": row["id"],
            "timestamp": row["timestamp"],
            "task_instruction": row["task_instruction"],
            "action_type": row["action_type"],
            "action_target": row["action_target"],
            "confidence": row["confidence"],
            "reason": row["reason"],
            "privacy_gate_verified": bool(row["privacy_gate_verified"]),
            "redacted_items_count": row["redacted_items_count"],
            "total_latency_ms": row["total_latency_ms"]
        }
        for row in rows
    ]

def record_telemetry(local_inf: float, red_ms: float, priv_ms: float, net_ms: float, ai_ms: float, total_ms: float, orig_size: int, san_size: int, webgpu: bool, cpu: Optional[float] = None, mem: Optional[float] = None):
    conn = get_connection()
    cursor = conn.cursor()
    now_str = time.strftime("%H:%M:%S")
    reduction = max(0.0, min(100.0, (1.0 - (san_size / orig_size)) * 100.0)) if orig_size > 0 else 0.0
    cursor.execute("""
        INSERT INTO telemetry (timestamp, local_inference_ms, redaction_ms, privacy_validation_ms, network_ms, ai_latency_ms, total_latency_ms, cpu_usage, memory_usage, webgpu_available, original_size_bytes, sanitized_size_bytes, data_reduction_pct)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (now_str, local_inf, red_ms, priv_ms, net_ms, ai_ms, total_ms, cpu, mem, 1 if webgpu else 0, orig_size, san_size, reduction))
    conn.commit()
    conn.close()

def get_telemetry_history(limit: int = 20) -> List[Dict[str, Any]]:
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT id, timestamp, local_inference_ms, redaction_ms, privacy_validation_ms, network_ms, ai_latency_ms, total_latency_ms, original_size_bytes, sanitized_size_bytes, data_reduction_pct
        FROM telemetry
        ORDER BY id DESC
        LIMIT ?
    """, (limit,))
    rows = cursor.fetchall()
    conn.close()
    
    # Return chronologically sorted for charts
    items = [
        {
            "id": row["id"],
            "time": row["timestamp"],
            "local": round(row["local_inference_ms"], 1),
            "redaction": round(row["redaction_ms"], 1),
            "gate": round(row["privacy_validation_ms"], 1),
            "network": round(row["network_ms"], 1),
            "ai": round(row["ai_latency_ms"], 1),
            "total": round(row["total_latency_ms"], 1),
            "orig_size": row["original_size_bytes"],
            "san_size": row["sanitized_size_bytes"],
            "reduction_pct": round(row["data_reduction_pct"], 1)
        }
        for row in reversed(rows)
    ]
    return items

def record_scan(url: str, page_title: str, sanitized_image: str, redacted_items_count: int, redacted_elements: List[Dict[str, Any]], dom_summary: Dict[str, Any], timing: Dict[str, float], status: str = "VERIFIED_SAFE") -> int:
    conn = get_connection()
    cursor = conn.cursor()
    now_str = time.strftime("%Y-%m-%d %H:%M:%S")
    cursor.execute("""
        INSERT INTO scans (timestamp, url, page_title, sanitized_image, redacted_items_count, redacted_elements_json, dom_summary_json, timing_json, privacy_gate_status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (now_str, url, page_title, sanitized_image, redacted_items_count, json.dumps(redacted_elements), json.dumps(dom_summary), json.dumps(timing), status))
    scan_id = cursor.lastrowid
    conn.commit()
    conn.close()
    return scan_id

def get_latest_scan() -> Optional[Dict[str, Any]]:
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT id, timestamp, url, page_title, sanitized_image, redacted_items_count, redacted_elements_json, dom_summary_json, timing_json, privacy_gate_status
        FROM scans
        ORDER BY id DESC
        LIMIT 1
    """)
    row = cursor.fetchone()
    conn.close()
    if not row:
        return None
    return {
        "id": row["id"],
        "timestamp": row["timestamp"],
        "url": row["url"],
        "page_title": row["page_title"],
        "sanitized_image": row["sanitized_image"],
        "redacted_items_count": row["redacted_items_count"],
        "redacted_elements": json.loads(row["redacted_elements_json"] or "[]"),
        "dom_summary": json.loads(row["dom_summary_json"] or "{}"),
        "timing_breakdown": json.loads(row["timing_json"] or "{}"),
        "privacy_gate_status": row["privacy_gate_status"]
    }

# Auto-initialize database on import
init_db()
