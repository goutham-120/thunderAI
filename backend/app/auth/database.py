"""
VAJRA-AI Authentication Database
SQLite via Python stdlib sqlite3 — zero new dependencies
"""
import sqlite3
import os
from datetime import datetime, timezone
from pathlib import Path
from app.auth.hashing import hash_password

# Store DB next to main.py so it persists across restarts
DB_PATH = Path(__file__).parent.parent.parent / "vajra_users.db"


def get_connection() -> sqlite3.Connection:
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    return conn


def init_db():
    """Create tables if they don't exist, and seed initial ADMIN account."""
    with get_connection() as conn:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS users (
                id               INTEGER PRIMARY KEY AUTOINCREMENT,
                full_name        TEXT    NOT NULL,
                email            TEXT    UNIQUE NOT NULL COLLATE NOCASE,
                password_hash    TEXT    NOT NULL,
                organization     TEXT    DEFAULT '',
                phone            TEXT    DEFAULT '',
                role             TEXT    NOT NULL DEFAULT 'USER',
                status           TEXT    NOT NULL DEFAULT 'PENDING_APPROVAL',
                created_at       TEXT    NOT NULL,
                approved_at      TEXT,
                rejection_reason TEXT    DEFAULT NULL
            )
        """)
        conn.commit()

        # Check if an admin exists; if not, create initial bootstrap admin
        cursor = conn.cursor()
        cursor.execute("SELECT id FROM users WHERE role = 'ADMIN' LIMIT 1")
        admin_row = cursor.fetchone()
        if not admin_row:
            admin_email = os.getenv("ADMIN_EMAIL", "admin@vajra.gov.in").strip().lower()
            admin_password = os.getenv("ADMIN_PASSWORD", "VajraAdmin@2026")
            now_iso = datetime.now(timezone.utc).isoformat()
            p_hash = hash_password(admin_password)

            cursor.execute("""
                INSERT OR IGNORE INTO users (
                    full_name, email, password_hash, organization, phone, role, status, created_at, approved_at
                ) VALUES (?, ?, ?, ?, ?, 'ADMIN', 'APPROVED', ?, ?)
            """, (
                "VAJRA Chief Administrator",
                admin_email,
                p_hash,
                "Ministry of Earth Sciences / IMD",
                "+91-11-24611792",
                now_iso,
                now_iso
            ))
            conn.commit()
