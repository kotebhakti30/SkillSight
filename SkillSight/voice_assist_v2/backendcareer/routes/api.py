"""
routes/api.py — Fixed API routes

FIXES:
  G1. All routes return proper JSON with correct Content-Type
  G2. Input sanitised — empty answer returns helpful message not crash
  G3. DB errors silently logged (don't crash the response)
  G4. 404 on unknown mode returns JSON not HTML
"""
from flask import Blueprint, jsonify, request
from voice_assist_v2.backendcareer.db import get_db
from voice_assist_v2.backendcareer.services.ai_service import analyze_answer, smalltalk_reply

api_bp = Blueprint("api_bp", __name__)


@api_bp.route("/api/questions/<mode>")
def get_questions(mode):
    valid_modes = {"mock", "smalltalk", "presentation"}
    if mode not in valid_modes:
        return jsonify({"error": f"Unknown mode '{mode}'. Valid modes: mock, smalltalk, presentation."}), 400

    conn = cursor = None
    try:
        conn   = get_db()
        cursor = conn.cursor(dictionary=True)
        cursor.execute(
            "SELECT id, question FROM questions WHERE type = %s ORDER BY RAND() LIMIT 20",
            (mode,)
        )
        rows = cursor.fetchall()
        if not rows:
            return jsonify({
                "error": "No questions found in the database. Run schema.sql in MySQL first: "
                         "SOURCE path/to/schema.sql;"
            }), 404
        return jsonify({"questions": rows})
    except Exception as e:
        print(f"[DB] get_questions error: {e}")
        return jsonify({"error": "Database error: " + str(e)}), 500
    finally:
        if cursor: cursor.close()
        if conn:   conn.close()


@api_bp.route("/api/analyze", methods=["POST"])
def analyze():
    """Mock / Presentation: returns feedback + score + tips."""
    try:
        data         = request.get_json(force=True, silent=True) or {}
        answer       = (data.get("answer")       or "").strip()
        question     = (data.get("question")     or "").strip()
        question_id  = data.get("question_id")
        session_type = (data.get("session_type") or "").strip()

        if not answer:
            return jsonify({
                "feedback": "No answer received. Please speak clearly and try again.",
                "score": 0,
                "tips": ["Make sure your microphone is on and speak for at least 5 seconds."]
            })

        result = analyze_answer(answer, question)

        # Save to DB (non-critical — don't fail the response if this errors)
        try:
            conn   = get_db()
            cursor = conn.cursor()
            cursor.execute(
                "INSERT INTO responses (question_id, session_type, user_answer, feedback, score) "
                "VALUES (%s, %s, %s, %s, %s)",
                (question_id, session_type, answer, result["feedback"], result["score"])
            )
            conn.commit()
            cursor.close()
            conn.close()
        except Exception as db_err:
            print(f"[DB] save response error (non-fatal): {db_err}")

        return jsonify(result)

    except Exception as e:
        print(f"[API] /analyze error: {e}")
        return jsonify({
            "feedback": "Server error while analysing. Please try again.",
            "score": 0,
            "tips": ["There was a server error. Check your terminal for details."]
        }), 500


@api_bp.route("/api/smalltalk", methods=["POST"])
def smalltalk():
    """Small Talk mode: returns comment + follow-up question."""
    try:
        data     = request.get_json(force=True, silent=True) or {}
        answer   = (data.get("answer")   or "").strip()
        question = (data.get("question") or "").strip()

        if not answer:
            return jsonify({
                "comment":  "I did not catch that.",
                "followup": "Could you say that again please?"
            })

        result = smalltalk_reply(answer, question)
        return jsonify(result)

    except Exception as e:
        print(f"[API] /smalltalk error: {e}")
        return jsonify({
            "comment":  "Thank you for sharing.",
            "followup": "Could you tell me more about that?"
        }), 500
