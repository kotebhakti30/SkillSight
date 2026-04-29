def analyze_pronunciation(user_audio_path, reference_phonemes):
    # Dummy scoring logic
    score = 70.0

    if score >= 85:
        feedback = "Good pronunciation. You are doing well."
    elif score >= 60:
        feedback = "Some sounds are unclear. Try again slowly."
    else:
        feedback = "Pronunciation needs improvement."

    return {
        "score": score,
        "feedback": feedback
    }
