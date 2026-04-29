from flask import Flask, send_file, request, jsonify, send_from_directory, render_template
from flask_cors import CORS
from gtts import gTTS
import os
import uuid
import hashlib
import mysql.connector
import random
import json

# ⚠️ If this import fails on Railway, comment it
try:
    from voice_assist_v2.backendcareer.routes.api import api_bp
except:
    api_bp = None

app = Flask(
    __name__,
    template_folder="backend/templates",
    static_folder=".",
    static_url_path=""
)

CORS(app)

# ---------- DATABASE (RAILWAY READY) ----------

def get_db():
    return mysql.connector.connect(
        host=os.getenv("MYSQLHOST"),
        user=os.getenv("MYSQLUSER"),
        password=os.getenv("MYSQLPASSWORD"),
        database=os.getenv("MYSQLDATABASE"),
        port=int(os.getenv("MYSQLPORT"))
    )

# ---------- ROUTES ----------

@app.route("/")
def home():
    return send_from_directory(".", "index.html")

@app.route("/categories.html")
def categories():
    return send_from_directory(".", "categories.html")

@app.route("/pronunciation")
def pronunciation():
    return render_template("pronunciation.html")

@app.route("/career")
def career():
    return render_template("career.html")

@app.route("/fun")
def fun():
    return render_template("fun.html")

# ---------- LOGIN ----------

@app.route("/login", methods=["POST"])
def login():
    data = request.json

    email = data.get("email")
    password = data.get("password")

    password_hash = hashlib.sha256(password.encode()).hexdigest()

    db = get_db()
    cursor = db.cursor(dictionary=True)

    cursor.execute(
        "SELECT * FROM users WHERE email=%s AND password_hash=%s",
        (email, password_hash)
    )

    user = cursor.fetchone()

    cursor.close()
    db.close()

    if user:
        return jsonify({
            "status": "success",
            "user": {"id": user["user_id"]}
        })
    else:
        return jsonify({
            "status": "error",
            "message": "User not found"
        })

# ---------- SIGNUP ----------

@app.route("/signup", methods=["POST"])
def signup():
    data = request.json

    name = data.get("name")
    email = data.get("email")
    password = data.get("password")

    password_hash = hashlib.sha256(password.encode()).hexdigest()

    db = get_db()
    cursor = db.cursor()

    cursor.execute("SELECT * FROM users WHERE email=%s", (email,))
    if cursor.fetchone():
        cursor.close()
        db.close()
        return jsonify({"status": "error", "message": "User already exists"})

    cursor.execute(
        "INSERT INTO users (name,email,password_hash) VALUES (%s,%s,%s)",
        (name, email, password_hash)
    )
    db.commit()

    user_id = cursor.lastrowid

    cursor.close()
    db.close()

    return jsonify({
        "status": "success",
        "user": {"id": user_id}
    })

# ---------- WORD API ----------

@app.route("/api/get-word")
def get_word():
    db = get_db()
    cursor = db.cursor(dictionary=True)

    cursor.execute("SELECT word, stress, tip FROM words ORDER BY RAND() LIMIT 1")
    result = cursor.fetchone()

    cursor.close()
    db.close()

    if not result:
        return jsonify({"error": "No words found"}), 404

    return jsonify(result)

# ---------- SAVE SESSION ----------

@app.route("/api/save-session", methods=["POST"])
def save_session():
    data = request.json

    db = get_db()
    cursor = db.cursor()

    cursor.execute(
        """
        INSERT INTO sessions (user_id, module, game, correct, total, results)
        VALUES (%s,%s,%s,%s,%s,%s)
        """,
        (
            data.get("userId"),
            data.get("module"),
            data.get("game"),
            data.get("correct"),
            data.get("total"),
            json.dumps(data.get("results"))
        )
    )

    db.commit()
    cursor.close()
    db.close()

    return jsonify({"status": "success"})

# ---------- GET SESSIONS ----------

@app.route("/api/get-sessions")
def get_sessions():
    user_id = request.args.get("userId")

    db = get_db()
    cursor = db.cursor(dictionary=True)

    cursor.execute(
        "SELECT correct, total, results FROM sessions WHERE user_id=%s ORDER BY id DESC",
        (user_id,)
    )

    sessions = cursor.fetchall()

    for s in sessions:
        if s["results"]:
            s["results"] = json.loads(s["results"])

    cursor.close()
    db.close()

    return jsonify(sessions)

@app.route("/api/dashboard")
def dashboard():
    user_id = request.args.get("userId")

    if not user_id:
        return jsonify({"error": "Missing userId"}), 400

    conn = get_db()
    cursor = conn.cursor(dictionary=True)

    cursor.execute(
        "SELECT COUNT(*) as games FROM sessions WHERE user_id=%s",
        (user_id,)
    )
    games = cursor.fetchone()["games"]

    cursor.execute(
        "SELECT SUM(correct) as score FROM sessions WHERE user_id=%s",
        (user_id,)
    )
    result = cursor.fetchone()
    score = result["score"] if result["score"] else 0

    cursor.execute("""
        SELECT module, SUM(correct) as score
        FROM sessions
        WHERE user_id=%s
        GROUP BY module
    """, (user_id,))
    modules = cursor.fetchall()

    cursor.close()
    conn.close()

    return jsonify({
        "gamesPlayed": games,
        "totalScore": score,
        "moduleBreakdown": modules
    })

# ---------- AUDIO ----------

@app.route("/test-audio")
def test_audio():
    os.makedirs("storage", exist_ok=True)
    filename = f"storage/{uuid.uuid4()}.mp3"
    gTTS("Testing audio from SkillSight", lang="en").save(filename)
    return send_file(filename, mimetype="audio/mpeg")

# ---------- CORS ----------

@app.after_request
def add_cors(response):
    response.headers["Access-Control-Allow-Origin"] = "*"
    response.headers["Access-Control-Allow-Headers"] = "Content-Type"
    response.headers["Access-Control-Allow-Methods"] = "GET,POST,OPTIONS"
    return response

@app.route("/api/<path:p>", methods=["OPTIONS"])
def options_handler(p):
    return jsonify({}), 200

# ---------- OPTIONAL BLUEPRINT ----------

if api_bp:
    app.register_blueprint(api_bp)

# ---------- RUN ----------

if __name__ == "__main__":
    app.run(debug=True)