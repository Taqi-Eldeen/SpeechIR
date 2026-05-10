import os
import sqlite3
from contextlib import contextmanager
from pathlib import Path


DATABASE_PATH = Path(os.getenv("DATABASE_PATH", "speech_search.db"))
SCHEMA_PATH = Path(__file__).resolve().parent.parent / "db" / "schema.sql"


def _connect() -> sqlite3.Connection:
    conn = sqlite3.connect(DATABASE_PATH, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    return conn


def init_db() -> None:
    DATABASE_PATH.parent.mkdir(parents=True, exist_ok=True)
    with _connect() as conn:
        conn.executescript(SCHEMA_PATH.read_text(encoding="utf-8"))
        conn.commit()


@contextmanager
def get_db():
    conn = _connect()
    try:
        yield conn
    finally:
        conn.close()


def create_audio_file(filename: str, filepath: str) -> int:
    with _connect() as conn:
        cur = conn.execute(
            "INSERT INTO audio_files(filename, filepath, status) VALUES (?, ?, 'pending')",
            (filename, filepath),
        )
        conn.commit()
        return int(cur.lastrowid)


def update_audio_status(file_id: int, status: str, error_message: str | None = None) -> None:
    with _connect() as conn:
        conn.execute(
            "UPDATE audio_files SET status = ?, error_message = ? WHERE id = ?",
            (status, error_message, file_id),
        )
        conn.commit()


def insert_segment(file_id: int, start_s: float, end_s: float, text: str) -> None:
    with _connect() as conn:
        conn.execute(
            "INSERT INTO segments(file_id, start_s, end_s, text) VALUES (?, ?, ?, ?)",
            (file_id, start_s, end_s, text),
        )
        conn.commit()

