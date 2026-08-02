import os
import sqlite3
from pathlib import Path

import bcrypt

ROLE_ADMIN = "admin"
ROLE_BASIC = "basico"

SCHEMA_SQL = """
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL DEFAULT '',
    role TEXT NOT NULL DEFAULT 'basico'
);

CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS boards (
    id TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    position INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS columns (
    id TEXT PRIMARY KEY,
    board_id TEXT NOT NULL REFERENCES boards (id) ON DELETE CASCADE,
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

DEFAULT_COLUMN_TITLES = ["Backlog", "Discovery", "In Progress", "Review", "Done"]

SEED_USERNAME = "user"
SEED_PASSWORD = "password"
SEED_BOARD_ID = "board-1"
SEED_BOARD_NAME = "Mi tablero"

ADMIN_USERNAME = "admin"
ADMIN_PASSWORD = "admin"
ADMIN_BOARD_ID = "board-admin"

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


def _ensure_column(conn: sqlite3.Connection, table: str, column: str, ddl: str) -> None:
    existing = {row["name"] for row in conn.execute(f"PRAGMA table_info({table})")}
    if column not in existing:
        conn.execute(f"ALTER TABLE {table} ADD COLUMN {ddl}")


def _migrate_columns_to_boards(conn: sqlite3.Connection) -> None:
    """Move pre-Parte-12 `columns.user_id` rows onto a default board per user."""
    existing = {row["name"] for row in conn.execute("PRAGMA table_info(columns)")}
    if "user_id" not in existing:
        return

    conn.execute("PRAGMA foreign_keys = OFF")
    _ensure_column(conn, "columns", "board_id", "board_id TEXT")

    user_ids = [row["user_id"] for row in conn.execute("SELECT DISTINCT user_id FROM columns")]
    for user_id in user_ids:
        board_id = f"board-{user_id}"
        conn.execute(
            "INSERT OR IGNORE INTO boards (id, user_id, name, position) VALUES (?, ?, ?, 0)",
            (board_id, user_id, SEED_BOARD_NAME),
        )
        conn.execute(
            "UPDATE columns SET board_id = ? WHERE user_id = ? AND board_id IS NULL",
            (board_id, user_id),
        )

    conn.executescript(
        """
        CREATE TABLE columns_migrated (
            id TEXT PRIMARY KEY,
            board_id TEXT NOT NULL REFERENCES boards (id) ON DELETE CASCADE,
            title TEXT NOT NULL,
            position INTEGER NOT NULL
        );
        INSERT INTO columns_migrated (id, board_id, title, position)
            SELECT id, board_id, title, position FROM columns;
        DROP TABLE columns;
        ALTER TABLE columns_migrated RENAME TO columns;
        """
    )
    conn.execute("PRAGMA foreign_keys = ON")


def init_db(conn: sqlite3.Connection) -> None:
    conn.executescript(SCHEMA_SQL)
    _ensure_column(conn, "users", "password_hash", "password_hash TEXT NOT NULL DEFAULT ''")
    _ensure_column(conn, "users", "role", "role TEXT NOT NULL DEFAULT 'basico'")
    _migrate_columns_to_boards(conn)

    if conn.execute("SELECT COUNT(*) FROM users").fetchone()[0] == 0:
        password_hash = bcrypt.hashpw(SEED_PASSWORD.encode(), bcrypt.gensalt()).decode()
        conn.execute(
            "INSERT INTO users (id, username, password_hash, role) VALUES (?, ?, ?, ?)",
            (MVP_USER_ID, SEED_USERNAME, password_hash, ROLE_BASIC),
        )
        conn.execute(
            "INSERT INTO boards (id, user_id, name, position) VALUES (?, ?, ?, 0)",
            (SEED_BOARD_ID, MVP_USER_ID, SEED_BOARD_NAME),
        )
        conn.executemany(
            "INSERT INTO columns (id, board_id, title, position) VALUES (?, ?, ?, ?)",
            [(id_, SEED_BOARD_ID, title, position) for id_, title, position in SEED_COLUMNS],
        )
        conn.executemany(
            "INSERT INTO cards (id, column_id, title, details, position) VALUES (?, ?, ?, ?, ?)",
            SEED_CARDS,
        )

    if conn.execute("SELECT COUNT(*) FROM users WHERE username = ?", (ADMIN_USERNAME,)).fetchone()[0] == 0:
        admin_password_hash = bcrypt.hashpw(ADMIN_PASSWORD.encode(), bcrypt.gensalt()).decode()
        cursor = conn.execute(
            "INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)",
            (ADMIN_USERNAME, admin_password_hash, ROLE_ADMIN),
        )
        admin_id = cursor.lastrowid
        conn.execute(
            "INSERT INTO boards (id, user_id, name, position) VALUES (?, ?, ?, 0)",
            (ADMIN_BOARD_ID, admin_id, SEED_BOARD_NAME),
        )
        conn.executemany(
            "INSERT INTO columns (id, board_id, title, position) VALUES (?, ?, ?, ?)",
            [(f"{id_}-admin", ADMIN_BOARD_ID, title, position) for id_, title, position in SEED_COLUMNS],
        )

    conn.commit()


def get_db():
    conn = get_connection()
    try:
        yield conn
    finally:
        conn.close()
