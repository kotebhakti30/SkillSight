from gtts import gTTS
import os
import uuid

def text_to_speech(text, lang="en"):
    os.makedirs("storage/tts", exist_ok=True)

    filename = f"{uuid.uuid4()}.mp3"
    path = f"storage/tts/{filename}"

    tts = gTTS(text=text, lang=lang)
    tts.save(path)

    # IMPORTANT: only return path
    return "/" + path
