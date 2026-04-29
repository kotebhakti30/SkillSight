# import mysql.connector
# import speech_recognition as sr
# import pyttsx3
# import hashlib
# import re
# import time

# # ---------------- VOICE SETUP ----------------
# engine = pyttsx3.init()
# engine.setProperty("rate", 165)

# def speak(text):
#     """Convert text to speech"""
#     engine.say(text)
#     engine.runAndWait()

# # ---------------- LISTEN (ROBUST) ----------------
# def listen():
#     """Listen to microphone and return recognized text"""
#     r = sr.Recognizer()
#     r.pause_threshold = 0.8

#     with sr.Microphone() as source:
#         r.adjust_for_ambient_noise(source, duration=0.7)
#         try:
#             audio = r.listen(source, timeout=5, phrase_time_limit=6)
#         except sr.WaitTimeoutError:
#             return None

#     try:
#         text = r.recognize_google(audio)
#         return text.lower().strip()
#     except Exception as e:
#         return None

# # ---------------- DATABASE ----------------
# def get_db_connection():
#     """Create and return a new database connection"""
#     return mysql.connector.connect(
#         host="localhost",
#         user="root",
#         password="root",
#         database="SkillSight"
#     )

# # ---------------- HELPERS ----------------
# def hash_password(password):
#     """Hash password using SHA256"""
#     return hashlib.sha256(password.encode()).hexdigest()

# def is_valid_email(email):
#     """Validate email format"""
#     return re.match(r"^[^\s@]+@[^\s@]+\.[^\s@]+$", email) is not None

# # ---------------- SIGN UP ----------------
# def voice_signup():
#     """Voice-based signup flow"""
#     # Get name
#     while True:
#         speak("Please say your name")
#         name = listen()
#         if name and len(name.strip()) >= 2:
#             break
#         speak("I did not hear your name")

#     # Get email
#     while True:
#         speak("Please say your email")
#         email = listen()
#         if email and is_valid_email(email):
#             break
#         speak("Invalid email. Please try again")

#     # Get password
#     while True:
#         speak("Please say your password")
#         password = listen()
#         if password and len(password) >= 6:
#             break
#         speak("Password must be at least six characters")

#     try:
#         db = get_db_connection()
#         cursor = db.cursor()
        
#         cursor.execute(
#             "INSERT INTO users (name, email, password_hash) VALUES (%s, %s, %s)",
#             (name.strip(), email.strip(), hash_password(password))
#         )
#         db.commit()
#         cursor.close()
#         db.close()
        
#         speak(f"Signup successful. Welcome {name}")
        
#     except mysql.connector.Error as err:
#         if err.errno == 1062:  # Duplicate entry
#             speak("This email is already registered")
#         else:
#             speak("An error occurred during signup. Please try again")
#     except Exception as err:
#         speak("An error occurred. Please try again")

# # ---------------- LOGIN ----------------
# def voice_login():
#     """Voice-based login flow"""
#     # Get email
#     while True:
#         speak("Please say your email")
#         email = listen()
#         if email:
#             break
#         speak("I did not hear your email")

#     # Get password
#     while True:
#         speak("Please say your password")
#         password = listen()
#         if password:
#             break
#         speak("I did not hear your password")

#     try:
#         db = get_db_connection()
#         cursor = db.cursor()
        
#         cursor.execute(
#             "SELECT name FROM users WHERE email=%s AND password_hash=%s",
#             (email.strip(), hash_password(password))
#         )
#         user = cursor.fetchone()
#         cursor.close()
#         db.close()

#         if user:
#             speak(f"Login successful. Welcome {user[0]}")
#         else:
#             speak("Invalid email or password")
            
#     except mysql.connector.Error as err:
#         speak("An error occurred during login. Please try again")
#     except Exception as err:
#         speak("An error occurred. Please try again")

# # ---------------- MAIN FLOW ----------------
# def start_app():
#     """Main application flow"""
#     speak("Welcome to Skillsight")
#     time.sleep(0.5)

#     while True:
#         speak("Say login or sign up")
#         choice = listen()

#         if not choice:
#             speak("I did not hear you")
#             continue

#         if "login" in choice:
#             voice_login()
#             break

#         if "sign up" in choice or "signup" in choice:
#             voice_signup()
#             break

#         speak("Invalid option")

# # ---------------- START ----------------
# if __name__ == "__main__":
#     start_app()
