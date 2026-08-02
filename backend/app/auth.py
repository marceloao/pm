import secrets
import sqlite3
from datetime import datetime, timezone

import bcrypt
from fastapi import Cookie, Depends, HTTPException

from app.database import ROLE_ADMIN, get_db

SESSION_COOKIE_NAME = "session_id"


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()


def verify_password(password: str, password_hash: str) -> bool:
    return bcrypt.checkpw(password.encode(), password_hash.encode())


def create_session(conn: sqlite3.Connection, user_id: int) -> str:
    session_id = secrets.token_urlsafe(32)
    conn.execute(
        "INSERT INTO sessions (id, user_id, created_at) VALUES (?, ?, ?)",
        (session_id, user_id, datetime.now(timezone.utc).isoformat()),
    )
    return session_id


def delete_session(conn: sqlite3.Connection, session_id: str) -> None:
    conn.execute("DELETE FROM sessions WHERE id = ?", (session_id,))


def get_current_user_id(
    session_id: str | None = Cookie(default=None, alias=SESSION_COOKIE_NAME),
    conn: sqlite3.Connection = Depends(get_db),
) -> int:
    if session_id is None:
        raise HTTPException(status_code=401, detail="Not authenticated")

    row = conn.execute(
        "SELECT user_id FROM sessions WHERE id = ?", (session_id,)
    ).fetchone()
    if row is None:
        raise HTTPException(status_code=401, detail="Not authenticated")

    return row["user_id"]


def require_admin(
    user_id: int = Depends(get_current_user_id),
    conn: sqlite3.Connection = Depends(get_db),
) -> int:
    role = conn.execute("SELECT role FROM users WHERE id = ?", (user_id,)).fetchone()["role"]
    if role != ROLE_ADMIN:
        raise HTTPException(status_code=403, detail="Admin access required")
    return user_id
