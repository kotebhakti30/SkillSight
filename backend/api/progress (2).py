@app.route("/replay/<int:attempt_id>")
def replay_audio(attempt_id):
    audio = get_audio_path(attempt_id)
    return send_file(audio, mimetype="audio/wav")
