import mysql.connector
from flask import Blueprint, jsonify, request
import os
from dotenv import load_dotenv

load_dotenv()

pronunciation_bp = Blueprint('pronunciation', __name__)

def get_db_connection():
    return mysql.connector.connect(
        host=os.environ.get("DB_HOST"),
        port=int(os.environ.get("DB_PORT", 3306)),
        user=os.environ.get("DB_USER"),
        password=os.environ.get("DB_PASSWORD"),
        database=os.environ.get("DB_NAME")
    )



@pronunciation_bp.route("/get-word", methods=["GET"])
def get_word():
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        cursor.execute(
            "SELECT word, stress, tip FROM words ORDER BY RAND() LIMIT 1"
        )
        row = cursor.fetchone()

        cursor.close()
        conn.close()

        if not row:
            return jsonify({"error": "No data found"}), 404

        return jsonify({
            "word": row[0],
            "stress": row[1],
            "tip": row[2]
        })

    except Exception as e:
        return jsonify({"error": str(e)}), 500
    
@pronunciation_bp.route("/save-session", methods=["POST"])
def save_session():
    

    data = request.json
    correct = data.get("correct")
    total = data.get("total")

    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute(
        "INSERT INTO sessions (correct, total) VALUES (%s, %s)",
        (correct, total)
    )

    conn.commit()
    cursor.close()
    conn.close()

    return jsonify({"message": "saved"})

@pronunciation_bp.route("/get-sessions", methods=["GET"])
def get_sessions():
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT correct, total, created_at FROM sessions ORDER BY id DESC")
    rows = cursor.fetchall()

    cursor.close()
    conn.close()

    return jsonify([
        {
            "correct": r[0],
            "total": r[1],
            "date": str(r[2])
        } for r in rows
    ])