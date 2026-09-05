import sqlite3
import json
import os
import uuid
from datetime import datetime
from typing import Optional, List, Dict, Any
from app.config import settings

class Database:
    def __init__(self):
        self.db_path = settings.SQLITE_DB_PATH
        self.init_db()

    def get_connection(self):
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        return conn

    def init_db(self):
        with self.get_connection() as conn:
            cursor = conn.cursor()
            # Users table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS users (
                    id TEXT PRIMARY KEY,
                    name TEXT NOT NULL,
                    email TEXT UNIQUE NOT NULL,
                    hashed_password TEXT NOT NULL,
                    created_at TEXT NOT NULL
                )
            """)
            # Roasts table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS roasts (
                    id TEXT PRIMARY KEY,
                    user_id TEXT,
                    file_name TEXT NOT NULL,
                    created_at TEXT NOT NULL,
                    intensity TEXT NOT NULL,
                    ats_score INTEGER NOT NULL,
                    overall_verdict TEXT NOT NULL,
                    data_json TEXT NOT NULL,
                    FOREIGN KEY(user_id) REFERENCES users(id)
                )
            """)
            # Older databases predate guest scoping; add the column in place.
            columns = {row["name"] for row in cursor.execute("PRAGMA table_info(roasts)")}
            if "guest_id" not in columns:
                cursor.execute("ALTER TABLE roasts ADD COLUMN guest_id TEXT")
            conn.commit()

    # User operations
    def create_user(self, name: str, email: str, hashed_password: str) -> dict:
        user_id = str(uuid.uuid4())
        created_at = datetime.utcnow().isoformat()
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                "INSERT INTO users (id, name, email, hashed_password, created_at) VALUES (?, ?, ?, ?, ?)",
                (user_id, name, email.lower().strip(), hashed_password, created_at)
            )
            conn.commit()
        return {
            "id": user_id,
            "name": name,
            "email": email.lower().strip(),
            "created_at": created_at
        }

    def get_user_by_email(self, email: str) -> Optional[dict]:
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM users WHERE email = ?", (email.lower().strip(),))
            row = cursor.fetchone()
            if row:
                return dict(row)
            return None

    def get_user_by_id(self, user_id: str) -> Optional[dict]:
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT id, name, email, created_at FROM users WHERE id = ?", (user_id,))
            row = cursor.fetchone()
            if row:
                return dict(row)
            return None

    # Roast operations
    def save_roast(self, roast_data: dict, guest_id: Optional[str] = None) -> dict:
        roast_id = roast_data["id"]
        user_id = roast_data.get("user_id")
        file_name = roast_data["file_name"]
        created_at = roast_data["created_at"]
        intensity = roast_data["intensity"]
        ats_score = roast_data["ats_analysis"]["total_score"]
        overall_verdict = roast_data["overall_verdict"]
        data_json = json.dumps(roast_data)

        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                """
                INSERT INTO roasts (id, user_id, guest_id, file_name, created_at, intensity, ats_score, overall_verdict, data_json)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (roast_id, user_id, None if user_id else guest_id, file_name, created_at, intensity, ats_score, overall_verdict, data_json)
            )
            conn.commit()
        return roast_data

    def get_roast_by_id(self, roast_id: str) -> Optional[dict]:
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT data_json FROM roasts WHERE id = ?", (roast_id,))
            row = cursor.fetchone()
            if row:
                return json.loads(row["data_json"])
            return None

    def get_roast_owner(self, roast_id: str) -> Optional[dict]:
        """Return {"user_id", "guest_id"} for a roast, or None if it does not exist."""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT user_id, guest_id FROM roasts WHERE id = ?", (roast_id,))
            row = cursor.fetchone()
            return dict(row) if row else None

    _SUMMARY_COLUMNS = "id, file_name, created_at, intensity, ats_score, overall_verdict"

    def get_user_roasts(self, user_id: Optional[str], guest_id: Optional[str] = None) -> List[dict]:
        """Roasts belonging to a signed-in user, or to one anonymous guest. Nothing for neither."""
        # created_at is stored as a display string, so rowid is the reliable insertion order.
        with self.get_connection() as conn:
            cursor = conn.cursor()
            if user_id:
                cursor.execute(
                    f"SELECT {self._SUMMARY_COLUMNS} FROM roasts WHERE user_id = ? ORDER BY rowid DESC",
                    (user_id,)
                )
            elif guest_id:
                cursor.execute(
                    f"SELECT {self._SUMMARY_COLUMNS} FROM roasts WHERE user_id IS NULL AND guest_id = ? ORDER BY rowid DESC LIMIT 50",
                    (guest_id,)
                )
            else:
                return []
            return [dict(row) for row in cursor.fetchall()]

    def get_public_roasts(self, limit: int = 10) -> List[dict]:
        """Most recent guest roasts for the public live feed (signed-in users' roasts stay private)."""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                f"SELECT {self._SUMMARY_COLUMNS} FROM roasts WHERE user_id IS NULL ORDER BY rowid DESC LIMIT ?",
                (limit,)
            )
            return [dict(row) for row in cursor.fetchall()]

    def count_roasts(self) -> int:
        with self.get_connection() as conn:
            return conn.execute("SELECT COUNT(*) FROM roasts").fetchone()[0]

    def delete_roast(self, roast_id: str, user_id: Optional[str] = None, guest_id: Optional[str] = None) -> bool:
        with self.get_connection() as conn:
            cursor = conn.cursor()
            if user_id:
                cursor.execute("DELETE FROM roasts WHERE id = ? AND user_id = ?", (roast_id, user_id))
            elif guest_id:
                cursor.execute(
                    "DELETE FROM roasts WHERE id = ? AND user_id IS NULL AND guest_id = ?",
                    (roast_id, guest_id)
                )
            else:
                return False
            conn.commit()
            return cursor.rowcount > 0

db = Database()
