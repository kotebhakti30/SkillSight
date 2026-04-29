import sqlite3

DB_PATH = "skillsight.db"

def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def save_attempt(user_id, word_id, score):
    conn = get_db()
    conn.execute(
        "INSERT INTO pronunciation_attempts (user_id, word_id, score) VALUES (?, ?, ?)",
        (user_id, word_id, score)
    )
    conn.commit()
    conn.close()


def get_user_progress(user_id):
    conn = get_db()
    rows = conn.execute(
        "SELECT COUNT(*) as total, AVG(score) as avg FROM pronunciation_attempts WHERE user_id=?",
        (user_id,)
    ).fetchone()
    conn.close()
    return rows
