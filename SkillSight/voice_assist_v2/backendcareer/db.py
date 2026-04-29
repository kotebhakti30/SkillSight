
import mysql.connector
from voice_assist_v2.backendcareer.config import DB_CONFIG

def get_db():
    return mysql.connector.connect(**DB_CONFIG)
