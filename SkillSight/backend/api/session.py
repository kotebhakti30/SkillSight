from flask import Blueprint, jsonify
from services.tts_service import text_to_speech

session_api = Blueprint("session_api", __name__)

@session_api.route("/end-session", methods=["POST"])
def end_session():
    summary = (
        "Session ended. "
        "You practiced five words. "
        "Your pronunciation accuracy improved. "
        "Good job."
    )

    summary_audio = text_to_speech(summary)

    return jsonify({
        "summary_audio": "/" + summary_audio
    })
