-- Stores master words
CREATE TABLE IF NOT EXISTS word_master (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    word TEXT NOT NULL,
    phonemes TEXT,
    reference_audio TEXT
);

-- Tracks learning progress per word
CREATE TABLE IF NOT EXISTS user_word_progress (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    word_id INTEGER,
    attempts INTEGER DEFAULT 0,
    last_score REAL,
    status TEXT,
    last_attempt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Stores each pronunciation attempt
CREATE TABLE IF NOT EXISTS pronunciation_attempts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    word_id INTEGER,
    audio_path TEXT,
    score REAL,
    feedback TEXT,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
