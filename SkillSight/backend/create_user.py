from backend.database.db import SessionLocal
from backend.models.user import User

db = SessionLocal()

user = User(name="Test User")
db.add(user)
db.commit()

print("User created with ID:", user.id)

db.close()
