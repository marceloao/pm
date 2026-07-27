import sqlite3
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, Response

from app.database import MVP_USER_ID, get_db
from app.schemas import (
    BoardOut,
    CardCreate,
    CardMove,
    CardOut,
    CardUpdate,
    ColumnOut,
    ColumnRename,
)

router = APIRouter(prefix="/api")


def _fetch_column(conn: sqlite3.Connection, column_id: str) -> sqlite3.Row:
    column = conn.execute(
        "SELECT id, title, position FROM columns WHERE id = ?", (column_id,)
    ).fetchone()
    if column is None:
        raise HTTPException(status_code=404, detail="Column not found")
    return column


def _fetch_card(conn: sqlite3.Connection, card_id: str) -> sqlite3.Row:
    card = conn.execute(
        "SELECT id, column_id, title, details, position FROM cards WHERE id = ?",
        (card_id,),
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


@router.get("/board")
def get_board(conn: sqlite3.Connection = Depends(get_db)) -> BoardOut:
    columns = conn.execute(
        "SELECT id, title, position FROM columns WHERE user_id = ? ORDER BY position",
        (MVP_USER_ID,),
    ).fetchall()
    return BoardOut(
        columns=[
            ColumnOut(**dict(column), cards=_column_cards(conn, column["id"]))
            for column in columns
        ]
    )


@router.post("/cards", status_code=201)
def create_card(
    card: CardCreate, conn: sqlite3.Connection = Depends(get_db)
) -> CardOut:
    _fetch_column(conn, card.column_id)

    next_position = conn.execute(
        "SELECT COALESCE(MAX(position) + 1, 0) FROM cards WHERE column_id = ?",
        (card.column_id,),
    ).fetchone()[0]

    card_id = f"card-{uuid4().hex[:8]}"
    conn.execute(
        "INSERT INTO cards (id, column_id, title, details, position) VALUES (?, ?, ?, ?, ?)",
        (card_id, card.column_id, card.title, card.details, next_position),
    )
    conn.commit()

    return CardOut(id=card_id, title=card.title, details=card.details, position=next_position)


@router.patch("/cards/{card_id}")
def update_card(
    card_id: str, update: CardUpdate, conn: sqlite3.Connection = Depends(get_db)
) -> CardOut:
    card = _fetch_card(conn, card_id)

    title = update.title if update.title is not None else card["title"]
    details = update.details if update.details is not None else card["details"]

    conn.execute(
        "UPDATE cards SET title = ?, details = ? WHERE id = ?",
        (title, details, card_id),
    )
    conn.commit()

    return CardOut(id=card_id, title=title, details=details, position=card["position"])


@router.delete("/cards/{card_id}", status_code=204)
def delete_card(card_id: str, conn: sqlite3.Connection = Depends(get_db)) -> Response:
    _fetch_card(conn, card_id)
    conn.execute("DELETE FROM cards WHERE id = ?", (card_id,))
    conn.commit()
    return Response(status_code=204)


@router.post("/cards/{card_id}/move")
def move_card(
    card_id: str, move: CardMove, conn: sqlite3.Connection = Depends(get_db)
) -> CardOut:
    card = _fetch_card(conn, card_id)
    _fetch_column(conn, move.column_id)

    old_column_id = card["column_id"]
    old_position = card["position"]

    conn.execute(
        "UPDATE cards SET position = position - 1 "
        "WHERE column_id = ? AND position > ? AND id != ?",
        (old_column_id, old_position, card_id),
    )
    conn.execute(
        "UPDATE cards SET position = position + 1 "
        "WHERE column_id = ? AND position >= ? AND id != ?",
        (move.column_id, move.position, card_id),
    )
    conn.execute(
        "UPDATE cards SET column_id = ?, position = ? WHERE id = ?",
        (move.column_id, move.position, card_id),
    )
    conn.commit()

    return CardOut(
        id=card_id, title=card["title"], details=card["details"], position=move.position
    )


@router.patch("/columns/{column_id}")
def rename_column(
    column_id: str, rename: ColumnRename, conn: sqlite3.Connection = Depends(get_db)
) -> ColumnOut:
    column = _fetch_column(conn, column_id)
    conn.execute("UPDATE columns SET title = ? WHERE id = ?", (rename.title, column_id))
    conn.commit()

    return ColumnOut(
        id=column_id,
        title=rename.title,
        position=column["position"],
        cards=_column_cards(conn, column_id),
    )
