import sqlite3

from fastapi import APIRouter, Depends, HTTPException

from app.ai import ask_ai, ask_ai_chat, parse_ai_chat_output
from app.database import get_db
from app.routes import (
    _apply_card_move,
    _apply_card_update,
    _fetch_card,
    _fetch_column,
    _insert_card,
    fetch_board,
)
from app.schemas import AiAction, ChatRequest, ChatResponse

router = APIRouter(prefix="/api/ai")


@router.get("/ping")
async def ping() -> dict[str, str]:
    question = "What is 2+2? Reply with only the number."
    try:
        answer = await ask_ai(question)
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"AI request failed: {exc}") from exc

    return {"question": question, "answer": answer}


def _apply_action(conn: sqlite3.Connection, action: AiAction) -> None:
    if action.type == "create_card":
        if not action.column_id or not action.title:
            raise ValueError("create_card requires column_id and title")
        _fetch_column(conn, action.column_id)
        _insert_card(conn, action.column_id, action.title, action.details or "")
    elif action.type == "update_card":
        if not action.card_id:
            raise ValueError("update_card requires card_id")
        card = _fetch_card(conn, action.card_id)
        _apply_card_update(conn, card, action.title, action.details)
    elif action.type == "move_card":
        if not action.card_id or not action.column_id or action.position is None:
            raise ValueError("move_card requires card_id, column_id and position")
        card = _fetch_card(conn, action.card_id)
        _fetch_column(conn, action.column_id)
        _apply_card_move(conn, card, action.column_id, action.position)
    elif action.type == "delete_card":
        if not action.card_id:
            raise ValueError("delete_card requires card_id")
        _fetch_card(conn, action.card_id)
        conn.execute("DELETE FROM cards WHERE id = ?", (action.card_id,))
    elif action.type == "rename_column":
        if not action.column_id or not action.title:
            raise ValueError("rename_column requires column_id and title")
        _fetch_column(conn, action.column_id)
        conn.execute(
            "UPDATE columns SET title = ? WHERE id = ?", (action.title, action.column_id)
        )


@router.post("/chat")
async def chat(
    request: ChatRequest, conn: sqlite3.Connection = Depends(get_db)
) -> ChatResponse:
    board = fetch_board(conn)
    history = [{"role": m.role, "content": m.content} for m in request.history]

    try:
        raw = await ask_ai_chat(board.model_dump(), history, request.message)
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"AI request failed: {exc}") from exc

    output = parse_ai_chat_output(raw)

    if output.actions:
        try:
            for action in output.actions:
                _apply_action(conn, action)
        except (HTTPException, ValueError):
            conn.rollback()
        else:
            conn.commit()

    return ChatResponse(reply=output.reply, board=fetch_board(conn))
