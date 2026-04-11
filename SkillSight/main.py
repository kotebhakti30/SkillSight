from flask import Flask, send_file, request, jsonify, send_from_directory, render_template
from flask_cors import CORS
from gtts import gTTS
import os
import uuid
import hashlib
import mysql.connector
import random
import json

from voice_assist_v2.backendcareer.routes.api import api_bp

app = Flask(
    __name__,
    template_folder="backend/templates",
    static_folder=".",
    static_url_path=""
)

CORS(app)

# ---------- DATABASE ----------

def get_db():
    return mysql.connector.connect(
        host="localhost",
        user="root",
        password="root",
        database="skillsight"
    )

# ---------- ROUTES ----------

# LOGIN PAGE (FIRST PAGE ✅)
@app.route("/")
def home():
    return send_from_directory(".", "index.html")

# CATEGORIES PAGE
@app.route("/categories.html")
def categories():
    return send_from_directory(".", "categories.html")

# PRONUNCIATION PAGE
@app.route("/pronunciation")
def pronunciation():
    return render_template("pronunciation.html")

# CAREER PAGE
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

import json

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
            json.dumps(data.get("results"))   # 🔥 SAVE RESULTS
        )
    )

    db.commit()
    cursor.close()
    db.close()

    return jsonify({"status": "success"})

# ---------- GET SESSIONS ----------

import json

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

    # 🔥 convert JSON string → object
    for s in sessions:
        if s["results"]:
            s["results"] = json.loads(s["results"])

    cursor.close()
    db.close()

    return jsonify(sessions)

@app.route("/api/dashboard")
def dashboard():
    user_id = request.args.get("userId")

    # 🚨 safety check
    if not user_id:
        return jsonify({"error": "Missing userId"}), 400

    conn = get_db()
    cursor = conn.cursor(dictionary=True)

    # total games
    cursor.execute(
        "SELECT COUNT(*) as games FROM sessions WHERE user_id=%s",
        (user_id,)
    )
    games = cursor.fetchone()["games"]

    # total score
    cursor.execute(
        "SELECT SUM(correct) as score FROM sessions WHERE user_id=%s",
        (user_id,)
    )
    result = cursor.fetchone()
    score = result["score"] if result["score"] else 0

    # module-wise breakdown
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

# ---------- AUDIO TEST ----------

@app.route("/test-audio")
def test_audio():
    os.makedirs("storage", exist_ok=True)
    filename = f"storage/{uuid.uuid4()}.mp3"
    gTTS("Testing audio from SkillSight", lang="en").save(filename)
    return send_file(filename, mimetype="audio/mpeg")

# ---------- CORS FIX ----------

@app.after_request
def add_cors(response):
    response.headers["Access-Control-Allow-Origin"] = "*"
    response.headers["Access-Control-Allow-Headers"] = "Content-Type"
    response.headers["Access-Control-Allow-Methods"] = "GET,POST,OPTIONS"
    return response

@app.route("/api/<path:p>", methods=["OPTIONS"])
def options_handler(p):
    return jsonify({}), 200

# ---------- REGISTER BLUEPRINT ----------

app.register_blueprint(api_bp)

# ---------- FUN LEARNING MODULE ----------
@app.route("/debug-templates")
def debug_templates():
    template_path = app.template_folder
    files = os.listdir(template_path)
    return {
        "template_folder": template_path,
        "files": files
    }
# MATH GAME
@app.route("/mathgame")
def mathgame():
    return render_template("mathgame.html")

@app.route("/api/mathquestions")
def get_math_questions():
    conn = get_db()
    cursor = conn.cursor(dictionary=True)

    cursor.execute("SELECT * FROM math_game")
    rows = cursor.fetchall()

    cursor.close()
    conn.close()

    questions = []
    for row in rows:
        questions.append({
            "q": row["question"],
            "options": [
                row["option1"],
                row["option2"],
                row["option3"],
                row["option4"]
            ],
            "a": row["answer"]
        })

    random.shuffle(questions)
    return jsonify(questions)

# STORYTELLING
@app.route("/storytelling")
def storytelling_page():
    return render_template("storytelling.html")

@app.route("/api/game-data/storytelling")
def get_storytelling_data():
    conn = get_db()
    cursor = conn.cursor(dictionary=True)

    cursor.execute("SELECT * FROM storytelling")
    rows = cursor.fetchall()

    cursor.close()
    conn.close()

    stories = {}

    for row in rows:
        theme = row["theme"]
        blanks = json.loads(row["blanks"])

        story_obj = {
            "template": row["template"],
            "blanks": blanks
        }

        if theme not in stories:
            stories[theme] = []

        stories[theme].append(story_obj)

    return jsonify(stories)

# MEMORY CHAIN
@app.route("/memorychain")
def memorychain_page():
    return render_template("memorychain.html")

@app.route("/wordquiz")
def wordquiz_page():
    return render_template("wordquiz.html")

@app.route("/api/game-data/word_quiz")
def word_quiz():
    conn = get_db()
    cursor = conn.cursor(dictionary=True)

    cursor.execute("""
        SELECT category, question, option1, option2, option3, option4, correct_answer
        FROM wordquiz
    """)

    rows = cursor.fetchall()

    data = {}

    for row in rows:
        domain = row["category"]   # ✅ correct column

        q = {
            "q": row["question"],   # ✅ correct column
            "options": [
                row["option1"],
                row["option2"],
                row["option3"],
                row["option4"]
            ],
            "a": row["correct_answer"]   # ✅ correct column
        }

        if domain not in data:
            data[domain] = []

        data[domain].append(q)

    cursor.close()
    conn.close()

    return jsonify({
        "domains": {
            "english": data
        }
    })
# ---------- RUN ----------

if __name__ == "__main__":
    print("\n" + "="*50)
    print("Server running → http://127.0.0.1:5000")
    print("="*50 + "\n")
    app.run(debug=True)