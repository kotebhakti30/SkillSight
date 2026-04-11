from backend.database.db import SessionLocal
from backend.models.lesson import Lesson

db = SessionLocal()

words = ["presentation", "confidence", "communication", "practice"]

for w in words:
    if not db.query(Lesson).filter(Lesson.word == w).first():
        db.add(Lesson(word=w))

db.commit()
db.close()

print("Lessons added")
