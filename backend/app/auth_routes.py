import sqlite3
from uuid import uuid4

from fastapi import APIRouter, Cookie, Depends, HTTPException, Response

from app.auth import (
    SESSION_COOKIE_NAME,
    create_session,
    delete_session,
    get_current_user_id,
    hash_password,
    verify_password,
)
from app.database import ROLE_BASIC, SEED_BOARD_NAME, get_db
from app.routes import _create_default_columns
from app.schemas import AuthCredentials, PasswordChange, UserOut

router = APIRouter(prefix="/api/auth")


def _set_session_cookie(response: Response, session_id: str) -> None:
    response.set_cookie(SESSION_COOKIE_NAME, session_id, httponly=True, samesite="lax", path="/")


@router.post("/register", status_code=201)
def register(
    credentials: AuthCredentials,
    response: Response,
    conn: sqlite3.Connection = Depends(get_db),
) -> UserOut:
    existing = conn.execute(
        "SELECT id FROM users WHERE username = ?", (credentials.username,)
    ).fetchone()
    if existing is not None:
        raise HTTPException(status_code=409, detail="Username already exists")

    cursor = conn.execute(
        "INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)",
        (credentials.username, hash_password(credentials.password), ROLE_BASIC),
    )
    user_id = cursor.lastrowid

    board_id = f"board-{uuid4().hex[:8]}"
    conn.execute(
        "INSERT INTO boards (id, user_id, name, position) VALUES (?, ?, ?, 0)",
        (board_id, user_id, SEED_BOARD_NAME),
    )
    _create_default_columns(conn, board_id)

    session_id = create_session(conn, user_id)
    conn.commit()

    _set_session_cookie(response, session_id)
    return UserOut(id=user_id, username=credentials.username, role=ROLE_BASIC)


@router.post("/login")
def login(
    credentials: AuthCredentials,
    response: Response,
    conn: sqlite3.Connection = Depends(get_db),
) -> UserOut:
    user = conn.execute(
        "SELECT id, username, password_hash, role FROM users WHERE username = ?",
        (credentials.username,),
    ).fetchone()
    if user is None or not verify_password(credentials.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid username or password")

    session_id = create_session(conn, user["id"])
    conn.commit()

    _set_session_cookie(response, session_id)
    return UserOut(id=user["id"], username=user["username"], role=user["role"])


@router.post("/logout", status_code=204)
def logout(
    response: Response,
    session_id: str | None = Cookie(default=None, alias=SESSION_COOKIE_NAME),
    conn: sqlite3.Connection = Depends(get_db),
) -> Response:
    if session_id is not None:
        delete_session(conn, session_id)
        conn.commit()
    response.delete_cookie(SESSION_COOKIE_NAME, path="/")
    return Response(status_code=204)


@router.get("/me")
def me(
    user_id: int = Depends(get_current_user_id),
    conn: sqlite3.Connection = Depends(get_db),
) -> UserOut:
    row = conn.execute(
        "SELECT id, username, role FROM users WHERE id = ?", (user_id,)
    ).fetchone()
    return UserOut(id=row["id"], username=row["username"], role=row["role"])


@router.post("/change-password", status_code=204)
def change_password(
    payload: PasswordChange,
    user_id: int = Depends(get_current_user_id),
    conn: sqlite3.Connection = Depends(get_db),
) -> Response:
    row = conn.execute(
        "SELECT password_hash FROM users WHERE id = ?", (user_id,)
    ).fetchone()
    if not verify_password(payload.current_password, row["password_hash"]):
        raise HTTPException(status_code=401, detail="Current password is incorrect")

    conn.execute(
        "UPDATE users SET password_hash = ? WHERE id = ?",
        (hash_password(payload.new_password), user_id),
    )
    conn.commit()
    return Response(status_code=204)
