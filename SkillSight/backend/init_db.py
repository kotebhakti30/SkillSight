from backend.database.db import engine, Base
from backend.models.user import User
from backend.models.pronunciation import PronunciationAttempt
from backend.models.lesson import Lesson

Base.metadata.create_all(bind=engine)
print("Database initialized")
