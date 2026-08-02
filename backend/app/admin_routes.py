import sqlite3
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, Response

from app.auth import get_current_user_id, hash_password, require_admin
from app.database import ROLE_ADMIN, SEED_BOARD_NAME, get_db
from app.routes import _create_default_columns
from app.schemas import AdminUserCreate, AdminUserUpdate, UserOut

router = APIRouter(prefix="/api/admin", dependencies=[Depends(require_admin)])


def _fetch_user(conn: sqlite3.Connection, user_id: int) -> sqlite3.Row:
    user = conn.execute(
        "SELECT id, username, role FROM users WHERE id = ?", (user_id,)
    ).fetchone()
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")
    return user


def _admin_count(conn: sqlite3.Connection) -> int:
    return conn.execute(
        "SELECT COUNT(*) FROM users WHERE role = ?", (ROLE_ADMIN,)
    ).fetchone()[0]


@router.get("/users")
def list_users(conn: sqlite3.Connection = Depends(get_db)) -> list[UserOut]:
    rows = conn.execute(
        "SELECT id, username, role FROM users ORDER BY username"
    ).fetchall()
    return [UserOut(**dict(row)) for row in rows]


@router.post("/users", status_code=201)
def create_user(
    payload: AdminUserCreate, conn: sqlite3.Connection = Depends(get_db)
) -> UserOut:
    existing = conn.execute(
        "SELECT id FROM users WHERE username = ?", (payload.username,)
    ).fetchone()
    if existing is not None:
        raise HTTPException(status_code=409, detail="Username already exists")

    cursor = conn.execute(
        "INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)",
        (payload.username, hash_password(payload.password), payload.role),
    )
    user_id = cursor.lastrowid

    board_id = f"board-{uuid4().hex[:8]}"
    conn.execute(
        "INSERT INTO boards (id, user_id, name, position) VALUES (?, ?, ?, 0)",
        (board_id, user_id, SEED_BOARD_NAME),
    )
    _create_default_columns(conn, board_id)
    conn.commit()

    return UserOut(id=user_id, username=payload.username, role=payload.role)


@router.patch("/users/{target_id}")
def update_user(
    target_id: int,
    payload: AdminUserUpdate,
    user_id: int = Depends(get_current_user_id),
    conn: sqlite3.Connection = Depends(get_db),
) -> UserOut:
    user = _fetch_user(conn, target_id)

    if payload.role is not None and payload.role != user["role"]:
        if user["role"] == ROLE_ADMIN and payload.role != ROLE_ADMIN and _admin_count(conn) <= 1:
            raise HTTPException(status_code=400, detail="Cannot demote the only remaining admin")
        conn.execute("UPDATE users SET role = ? WHERE id = ?", (payload.role, target_id))

    if payload.password is not None:
        conn.execute(
            "UPDATE users SET password_hash = ? WHERE id = ?",
            (hash_password(payload.password), target_id),
        )

    conn.commit()
    return _fetch_user_out(conn, target_id)


def _fetch_user_out(conn: sqlite3.Connection, user_id: int) -> UserOut:
    return UserOut(**dict(_fetch_user(conn, user_id)))


@router.delete("/users/{target_id}", status_code=204)
def delete_user(
    target_id: int,
    user_id: int = Depends(get_current_user_id),
    conn: sqlite3.Connection = Depends(get_db),
) -> Response:
    user = _fetch_user(conn, target_id)

    if user["role"] == ROLE_ADMIN and _admin_count(conn) <= 1:
        raise HTTPException(status_code=400, detail="Cannot delete the only remaining admin")

    conn.execute("DELETE FROM users WHERE id = ?", (target_id,))
    conn.commit()
    return Response(status_code=204)
