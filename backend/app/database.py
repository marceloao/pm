import os
import sqlite3
from pathlib import Path

SCHEMA_SQL = """
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS columns (
    id TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    position INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS cards (
    id TEXT PRIMARY KEY,
    column_id TEXT NOT NULL REFERENCES columns (id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    details TEXT NOT NULL DEFAULT '',
    position INTEGER NOT NULL
);
"""

SEED_COLUMNS = [
    ("col-backlog", "Backlog", 0),
    ("col-discovery", "Discovery", 1),
    ("col-progress", "In Progress", 2),
    ("col-review", "Review", 3),
    ("col-done", "Done", 4),
]

SEED_CARDS = [
    ("card-1", "col-backlog", "Align roadmap themes", "Draft quarterly themes with impact statements and metrics.", 0),
    ("card-2", "col-backlog", "Gather customer signals", "Review support tags, sales notes, and churn feedback.", 1),
    ("card-3", "col-discovery", "Prototype analytics view", "Sketch initial dashboard layout and key drill-downs.", 0),
    ("card-4", "col-progress", "Refine status language", "Standardize column labels and tone across the board.", 0),
    ("card-5", "col-progress", "Design card layout", "Add hierarchy and spacing for scanning dense lists.", 1),
    ("card-6", "col-review", "QA micro-interactions", "Verify hover, focus, and loading states.", 0),
    ("card-7", "col-done", "Ship marketing page", "Final copy approved and asset pack delivered.", 0),
    ("card-8", "col-done", "Close onboarding sprint", "Document release notes and share internally.", 1),
]

MVP_USER_ID = 1


def get_db_path() -> Path:
    return Path(os.environ.get("DATABASE_PATH", "data/kanban.db"))


def get_connection() -> sqlite3.Connection:
    path = get_db_path()
    path.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(path, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


def init_db(conn: sqlite3.Connection) -> None:
    conn.executescript(SCHEMA_SQL)

    if conn.execute("SELECT COUNT(*) FROM users").fetchone()[0] == 0:
        conn.execute(
            "INSERT INTO users (id, username) VALUES (?, ?)",
            (MVP_USER_ID, "user"),
        )
        conn.executemany(
            "INSERT INTO columns (id, user_id, title, position) VALUES (?, ?, ?, ?)",
            [(id_, MVP_USER_ID, title, position) for id_, title, position in SEED_COLUMNS],
        )
        conn.executemany(
            "INSERT INTO cards (id, column_id, title, details, position) VALUES (?, ?, ?, ?, ?)",
            SEED_CARDS,
        )

    conn.commit()


def get_db():
    conn = get_connection()
    try:
        yield conn
    finally:
        conn.close()
