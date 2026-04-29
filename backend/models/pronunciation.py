class PronunciationAttempt:
    def __init__(self, user_id, word_id, audio_path, score, feedback):
        self.user_id = user_id
        self.word_id = word_id
        self.audio_path = audio_path
        self.score = score
        self.feedback = feedback
