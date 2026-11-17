import json
import sqlite3
from datetime import datetime
from pathlib import Path

DB_PATH = Path(__file__).resolve().parent / "chesspy.db"


def get_connection() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db() -> None:
    with get_connection() as conn:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS saved_games (
                id TEXT PRIMARY KEY,
                date TEXT NOT NULL,
                mode TEXT NOT NULL,
                plies INTEGER NOT NULL,
                outcome TEXT NOT NULL,
                result_label TEXT NOT NULL,
                pgn TEXT NOT NULL,
                final_pieces TEXT NOT NULL,
                timeline TEXT NOT NULL,
                history TEXT NOT NULL,
                created_at TEXT NOT NULL
            )
            """
        )
        conn.commit()


def upsert_saved_game(record: dict) -> dict:
    with get_connection() as conn:
        conn.execute(
            """
            INSERT INTO saved_games (
                id, date, mode, plies, outcome, result_label,
                pgn, final_pieces, timeline, history, created_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
                date = excluded.date,
                mode = excluded.mode,
                plies = excluded.plies,
                outcome = excluded.outcome,
                result_label = excluded.result_label,
                pgn = excluded.pgn,
                final_pieces = excluded.final_pieces,
                timeline = excluded.timeline,
                history = excluded.history
            """,
            (
                record["id"],
                record["date"],
                record["mode"],
                record["plies"],
                record["outcome"],
                record["resultLabel"],
                record["pgn"],
                json.dumps(record["finalPieces"], ensure_ascii=False),
                json.dumps(record["timeline"], ensure_ascii=False),
                json.dumps(record["history"], ensure_ascii=False),
                datetime.now().isoformat(),
            ),
        )
        conn.commit()
    return record


def list_saved_games() -> list[dict]:
    with get_connection() as conn:
        rows = conn.execute(
            """
            SELECT id, date, mode, plies, outcome, result_label,
                   pgn, final_pieces, timeline, history
            FROM saved_games
            ORDER BY created_at DESC
            """
        ).fetchall()

    result = []
    for row in rows:
        result.append(
            {
                "id": row["id"],
                "date": row["date"],
                "mode": row["mode"],
                "plies": row["plies"],
                "outcome": row["outcome"],
                "resultLabel": row["result_label"],
                "pgn": row["pgn"],
                "finalPieces": json.loads(row["final_pieces"]),
                "timeline": json.loads(row["timeline"]),
                "history": json.loads(row["history"]),
            }
        )
    return result


def delete_saved_game(record_id: str) -> bool:
    with get_connection() as conn:
        cursor = conn.execute(
            "DELETE FROM saved_games WHERE id = ?",
            (record_id.upper(),),
        )
        conn.commit()
        return cursor.rowcount > 0