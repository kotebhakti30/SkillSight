╔══════════════════════════════════════════════════════════════════╗
║          VOICE ASSIST — SETUP & RUN GUIDE (v2 FIXED)           ║
╚══════════════════════════════════════════════════════════════════╝

───────────────────────────────────────────────────────────────────
STEP 1 — MYSQL DATABASE
───────────────────────────────────────────────────────────────────
Open MySQL command line and run:

    SOURCE C:/full/path/to/voice_assist_v2/database/schema.sql;

This creates the `voice_assist` database and loads all 150 questions.
Run it only once. If you re-run it, use:
    DROP DATABASE IF EXISTS voice_assist;
first to reset.

───────────────────────────────────────────────────────────────────
STEP 2 — GROQ API KEY (for real AI feedback)
───────────────────────────────────────────────────────────────────
1. Go to: https://console.groq.com
2. Sign up / Log in
3. Click "API Keys" in the left sidebar
4. Click "Create API Key" → copy the key (starts with gsk_)
5. Open: backend/config.py
6. Set: GROQ_API_KEY = "gsk_paste_your_key_here"

Without a key the app still works using keyword-based scoring.
With a key you get real AI feedback (much better quality).

───────────────────────────────────────────────────────────────────
STEP 3 — MYSQL PASSWORD
───────────────────────────────────────────────────────────────────
Open: backend/config.py
Set: "password": "your_actual_mysql_password"

───────────────────────────────────────────────────────────────────
STEP 4 — INSTALL DEPENDENCIES
───────────────────────────────────────────────────────────────────
Open a terminal in the backend/ folder and run:

    pip install -r requirements.txt

(Flask, mysql-connector-python, groq)

───────────────────────────────────────────────────────────────────
STEP 5 — START THE SERVER
───────────────────────────────────────────────────────────────────
In the backend/ folder:

    python app.py

You should see:
    ═══════════════════════════════════════════════════════
      Voice Assist — starting on http://127.0.0.1:5000
      Open in Google Chrome or Microsoft Edge ONLY
    ═══════════════════════════════════════════════════════

───────────────────────────────────────────────────────────────────
STEP 6 — OPEN IN BROWSER
───────────────────────────────────────────────────────────────────
Open Google Chrome or Microsoft Edge (NOT Firefox / Safari).
Go to: http://127.0.0.1:5000

⚠ You MUST use Chrome or Edge — speech recognition only works there.
⚠ When asked for microphone permission, click ALLOW.

───────────────────────────────────────────────────────────────────
HOW THE APP WORKS
───────────────────────────────────────────────────────────────────
1. Tap the blue "Tap to Start" button (required for voice to work)
2. The app speaks: "Welcome to Work and Career English..."
3. Say: "Mock Interviews" / "Small Talk" / "Presentation"
   OR tap one of the buttons on screen
4. The question is read aloud automatically
5. Your microphone turns on automatically after the question
6. Speak your full answer — the mic waits 2.5 seconds of silence
   before submitting (so you can pause mid-sentence naturally)
7. The app gives you AI feedback and reads it aloud
8. Next question plays automatically — no button needed

VOICE COMMANDS (speak at any time):
  "stop" or "end session" → go back to home screen
  "next" or "skip"        → skip to next question (smalltalk only)
  "replay"                → hear the question again

───────────────────────────────────────────────────────────────────
TROUBLESHOOTING
───────────────────────────────────────────────────────────────────
• No speech at start?  → Must tap "Tap to Start" button first
• Mic not working?     → Check browser shows microphone icon
                         Allow mic access in browser settings
• Only captures 1 word → Fixed in v2 (continuous=true)
• AI not working?      → Check GROQ_API_KEY in config.py
                         Check terminal for "[Groq]" messages
• DB error?            → Check MySQL is running
                         Check password in config.py
                         Run schema.sql if not done yet
• App loads but blank? → Check browser console (F12)
                         speech.js must load from /static/speech.js

───────────────────────────────────────────────────────────────────
ALL BUGS FIXED IN v2
───────────────────────────────────────────────────────────────────
A. JS: speech.js loads correctly via Flask url_for (unchanged)
B. TTS: speakAndWait fixed — proper callback timing, Chrome keepalive
C. SR:  continuous=true, interimResults=true, full sentences captured
D. SR:  2.5s silence detection — mic waits for full answer
E. SR:  No echo capture — 300ms gap between TTS end and mic start
F. SR:  No infinite no-speech loop — max 3 retries then prompt user
G. Groq: Key validation bug FIXED (was: startswith("gsk_...") WRONG)
H. Groq: Detailed error logging in terminal
I. API: CORS headers added — fetch() never fails cross-origin
J. API: JSON error handling hardened on frontend AND backend
K. UX:  Start overlay fixes browser autoplay block
L. UX:  Voice commands: "stop", "next", "end session", "skip"
M. UX:  No button presses needed — fully hands-free after start tap
N. State: busy flag properly managed, no stuck states
O. State: No simultaneous TTS + mic (sequenced correctly)
