from sqlalchemy import Column, Integer, String
from backend.database.db import Base

class Lesson(Base):
    __tablename__ = "lessons"

    id = Column(Integer, primary_key=True)
    word = Column(String, unique=True)
