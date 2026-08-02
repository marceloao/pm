import sqlite3
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, Response

from app.auth import get_current_user_id
from app.database import DEFAULT_COLUMN_TITLES, get_db
from app.schemas import (
    BoardCreate,
    BoardOut,
    BoardRename,
    BoardSummary,
    CardCreate,
    CardMove,
    CardOut,
    CardUpdate,
    ColumnOut,
    ColumnRename,
)

router = APIRouter(prefix="/api")


def _fetch_board_row(conn: sqlite3.Connection, user_id: int, board_id: str) -> sqlite3.Row:
    board = conn.execute(
        "SELECT id, name FROM boards WHERE id = ? AND user_id = ?", (board_id, user_id)
    ).fetchone()
    if board is None:
        raise HTTPException(status_code=404, detail="Board not found")
    return board


def _fetch_column(conn: sqlite3.Connection, user_id: int, column_id: str) -> sqlite3.Row:
    column = conn.execute(
        """
        SELECT columns.id, columns.title, columns.position
        FROM columns
        JOIN boards ON boards.id = columns.board_id
        WHERE columns.id = ? AND boards.user_id = ?
        """,
        (column_id, user_id),
    ).fetchone()
    if column is None:
        raise HTTPException(status_code=404, detail="Column not found")
    return column


def _fetch_card(conn: sqlite3.Connection, user_id: int, card_id: str) -> sqlite3.Row:
    card = conn.execute(
        """
        SELECT cards.id, cards.column_id, cards.title, cards.details, cards.position
        FROM cards
        JOIN columns ON columns.id = cards.column_id
        JOIN boards ON boards.id = columns.board_id
        WHERE cards.id = ? AND boards.user_id = ?
        """,
        (card_id, user_id),
    ).fetchone()
    if card is None:
        raise HTTPException(status_code=404, detail="Card not found")
    return card


def _column_cards(conn: sqlite3.Connection, column_id: str) -> list[CardOut]:
    rows = conn.execute(
        "SELECT id, title, details, position FROM cards WHERE column_id = ? ORDER BY position",
        (column_id,),
    ).fetchall()
    return [CardOut(**dict(row)) for row in rows]


def _create_default_columns(conn: sqlite3.Connection, board_id: str) -> None:
    conn.executemany(
        "INSERT INTO columns (id, board_id, title, position) VALUES (?, ?, ?, ?)",
        [
            (f"col-{uuid4().hex[:8]}", board_id, title, position)
            for position, title in enumerate(DEFAULT_COLUMN_TITLES)
        ],
    )


def fetch_board(conn: sqlite3.Connection, user_id: int, board_id: str) -> BoardOut:
    board = _fetch_board_row(conn, user_id, board_id)
    columns = conn.execute(
        "SELECT id, title, position FROM columns WHERE board_id = ? ORDER BY position",
        (board_id,),
    ).fetchall()
    return BoardOut(
        id=board["id"],
        name=board["name"],
        columns=[
            ColumnOut(**dict(column), cards=_column_cards(conn, column["id"]))
            for column in columns
        ],
    )


@router.get("/boards")
def list_boards(
    user_id: int = Depends(get_current_user_id), conn: sqlite3.Connection = Depends(get_db)
) -> list[BoardSummary]:
    rows = conn.execute(
        "SELECT id, name FROM boards WHERE user_id = ? ORDER BY position", (user_id,)
    ).fetchall()
    return [BoardSummary(**dict(row)) for row in rows]


@router.post("/boards", status_code=201)
def create_board(
    board: BoardCreate,
    user_id: int = Depends(get_current_user_id),
    conn: sqlite3.Connection = Depends(get_db),
) -> BoardOut:
    next_position = conn.execute(
        "SELECT COALESCE(MAX(position) + 1, 0) FROM boards WHERE user_id = ?", (user_id,)
    ).fetchone()[0]

    board_id = f"board-{uuid4().hex[:8]}"
    conn.execute(
        "INSERT INTO boards (id, user_id, name, position) VALUES (?, ?, ?, ?)",
        (board_id, user_id, board.name, next_position),
    )
    _create_default_columns(conn, board_id)
    conn.commit()

    return fetch_board(conn, user_id, board_id)


@router.get("/boards/{board_id}")
def get_board(
    board_id: str,
    user_id: int = Depends(get_current_user_id),
    conn: sqlite3.Connection = Depends(get_db),
) -> BoardOut:
    return fetch_board(conn, user_id, board_id)


@router.patch("/boards/{board_id}")
def rename_board(
    board_id: str,
    rename: BoardRename,
    user_id: int = Depends(get_current_user_id),
    conn: sqlite3.Connection = Depends(get_db),
) -> BoardSummary:
    _fetch_board_row(conn, user_id, board_id)
    conn.execute("UPDATE boards SET name = ? WHERE id = ?", (rename.name, board_id))
    conn.commit()

    return BoardSummary(id=board_id, name=rename.name)


@router.delete("/boards/{board_id}", status_code=204)
def delete_board(
    board_id: str,
    user_id: int = Depends(get_current_user_id),
    conn: sqlite3.Connection = Depends(get_db),
) -> Response:
    _fetch_board_row(conn, user_id, board_id)

    remaining = conn.execute(
        "SELECT COUNT(*) FROM boards WHERE user_id = ?", (user_id,)
    ).fetchone()[0]
    if remaining <= 1:
        raise HTTPException(status_code=400, detail="Cannot delete the only board")

    conn.execute("DELETE FROM boards WHERE id = ?", (board_id,))
    conn.commit()
    return Response(status_code=204)


def _insert_card(
    conn: sqlite3.Connection, column_id: str, title: str, details: str
) -> tuple[str, int]:
    next_position = conn.execute(
        "SELECT COALESCE(MAX(position) + 1, 0) FROM cards WHERE column_id = ?",
        (column_id,),
    ).fetchone()[0]

    card_id = f"card-{uuid4().hex[:8]}"
    conn.execute(
        "INSERT INTO cards (id, column_id, title, details, position) VALUES (?, ?, ?, ?, ?)",
        (card_id, column_id, title, details, next_position),
    )
    return card_id, next_position


def _apply_card_update(
    conn: sqlite3.Connection, card: sqlite3.Row, title: str | None, details: str | None
) -> tuple[str, str]:
    title = title if title is not None else card["title"]
    details = details if details is not None else card["details"]
    conn.execute(
        "UPDATE cards SET title = ?, details = ? WHERE id = ?",
        (title, details, card["id"]),
    )
    return title, details


def _apply_card_move(
    conn: sqlite3.Connection, card: sqlite3.Row, column_id: str, position: int
) -> None:
    old_column_id = card["column_id"]
    old_position = card["position"]

    conn.execute(
        "UPDATE cards SET position = position - 1 "
        "WHERE column_id = ? AND position > ? AND id != ?",
        (old_column_id, old_position, card["id"]),
    )
    conn.execute(
        "UPDATE cards SET position = position + 1 "
        "WHERE column_id = ? AND position >= ? AND id != ?",
        (column_id, position, card["id"]),
    )
    conn.execute(
        "UPDATE cards SET column_id = ?, position = ? WHERE id = ?",
        (column_id, position, card["id"]),
    )


@router.post("/cards", status_code=201)
def create_card(
    card: CardCreate,
    user_id: int = Depends(get_current_user_id),
    conn: sqlite3.Connection = Depends(get_db),
) -> CardOut:
    _fetch_column(conn, user_id, card.column_id)
    card_id, position = _insert_card(conn, card.column_id, card.title, card.details)
    conn.commit()

    return CardOut(id=card_id, title=card.title, details=card.details, position=position)


@router.patch("/cards/{card_id}")
def update_card(
    card_id: str,
    update: CardUpdate,
    user_id: int = Depends(get_current_user_id),
    conn: sqlite3.Connection = Depends(get_db),
) -> CardOut:
    card = _fetch_card(conn, user_id, card_id)
    title, details = _apply_card_update(conn, card, update.title, update.details)
    conn.commit()

    return CardOut(id=card_id, title=title, details=details, position=card["position"])


@router.delete("/cards/{card_id}", status_code=204)
def delete_card(
    card_id: str,
    user_id: int = Depends(get_current_user_id),
    conn: sqlite3.Connection = Depends(get_db),
) -> Response:
    _fetch_card(conn, user_id, card_id)
    conn.execute("DELETE FROM cards WHERE id = ?", (card_id,))
    conn.commit()
    return Response(status_code=204)


@router.post("/cards/{card_id}/move")
def move_card(
    card_id: str,
    move: CardMove,
    user_id: int = Depends(get_current_user_id),
    conn: sqlite3.Connection = Depends(get_db),
) -> CardOut:
    card = _fetch_card(conn, user_id, card_id)
    _fetch_column(conn, user_id, move.column_id)
    _apply_card_move(conn, card, move.column_id, move.position)
    conn.commit()

    return CardOut(
        id=card_id, title=card["title"], details=card["details"], position=move.position
    )


@router.patch("/columns/{column_id}")
def rename_column(
    column_id: str,
    rename: ColumnRename,
    user_id: int = Depends(get_current_user_id),
    conn: sqlite3.Connection = Depends(get_db),
) -> ColumnOut:
    column = _fetch_column(conn, user_id, column_id)
    conn.execute("UPDATE columns SET title = ? WHERE id = ?", (rename.title, column_id))
    conn.commit()

    return ColumnOut(
        id=column_id,
        title=rename.title,
        position=column["position"],
        cards=_column_cards(conn, column_id),
    )
