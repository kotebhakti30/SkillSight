import os
from dotenv import load_dotenv

load_dotenv()

DB_CONFIG = {
    "host":     "localhost",
    "user":     "root",
    "password": os.environ.get("DB_PASSWORD", ""),
    "database": "skillsight"
}

GROQ_API_KEY = os.environ.get("GROQ_API_KEY", "")