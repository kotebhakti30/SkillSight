from flask import Blueprint, jsonify, request

from services.dictionary_service import get_meaning
from services.tts_service import text_to_speech

voice_api = Blueprint("voice_api", __name__)

# This should already be set when a word is given
CURRENT_WORD = {
    "word": "confidence"
}

@voice_api.route("/command", methods=["POST"])
def handle_command():
    command = request.json.get("command", "").lower()

    if command == "meaning":
        word = CURRENT_WORD["word"]

        meaning_text = get_meaning(word)

        spoken_audio = text_to_speech(
            f"The meaning of {word} is: {meaning_text}"
        )

        return jsonify({
            "audio": spoken_audio
        })

    return jsonify({
        "audio": text_to_speech("Command not recognized")
    })
