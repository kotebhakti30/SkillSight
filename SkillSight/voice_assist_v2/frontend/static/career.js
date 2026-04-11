/**
 * speech.js — Bulletproof Speech Engine v2
 * FIXES:
 *  - continuous=true, interimResults=true (full sentences captured)
 *  - 2.5s silence detection before submitting answer
 *  - No mic/TTS overlap (300ms gap after TTS ends)
 *  - Single recognition instance, no duplicates
 *  - Chrome TTS freeze keepalive hack
 *  - speakAndWait timing fixed with proper fallback timer
 *  - stopListening safe to call anytime
 */

/* ── TTS ─────────────────────────────────────────────────────────────────── */

let _voiceList = [];
function _loadVoices() {
    if (window.speechSynthesis) _voiceList = window.speechSynthesis.getVoices();
}
if (window.speechSynthesis) {
    _loadVoices();
    window.speechSynthesis.onvoiceschanged = _loadVoices;
    setTimeout(_loadVoices, 300);
    setTimeout(_loadVoices, 1000);
}

function _pickVoice() {
    const pref = /Google US English|Google UK English|Samantha|Karen|Daniel|Moira/;
    return _voiceList.find(v => v.lang.startsWith("en") && pref.test(v.name))
        || _voiceList.find(v => v.lang === "en-US")
        || _voiceList.find(v => v.lang.startsWith("en"))
        || null;
}

function _makeUtt(text) {
    const u = new SpeechSynthesisUtterance(text);
    u.rate = 0.88; u.pitch = 1.0; u.volume = 1.0;
    const v = _pickVoice(); if (v) u.voice = v;
    return u;
}

function speak(text) {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    setTimeout(() => window.speechSynthesis.speak(_makeUtt(text)), 80);
}

function speakAndWait(text, callback) {
    if (!callback) callback = function(){};
    if (!window.speechSynthesis) { setTimeout(callback, 0); return; }
    window.speechSynthesis.cancel();
    setTimeout(() => {
        const u = _makeUtt(text);
        const ms = Math.min(Math.max(text.length * 75, 1500), 30000);
        let fired = false;
        const done = () => { if (!fired) { fired = true; clearInterval(ka); clearTimeout(timer); callback(); } };
        const timer = setTimeout(done, ms + 1500);
        // Chrome keepalive: long utterances freeze without this
        const ka = setInterval(() => {
            if (fired) { clearInterval(ka); return; }
            if (window.speechSynthesis.speaking) {
                window.speechSynthesis.pause();
                window.speechSynthesis.resume();
            }
        }, 10000);
        u.onend = done;
        u.onerror = (e) => { if (e.error !== "interrupted") console.warn("[TTS]", e.error); done(); };
        window.speechSynthesis.speak(u);
    }, 120);
}

/* ── RECOGNITION ─────────────────────────────────────────────────────────── */

const SR = window.SpeechRecognition || window.webkitSpeechRecognition;

let _rec = null, _listening = false, _finalText = "", _silenceTimer = null;
let _cbResult = null, _cbError = null;
const SILENCE_MS = 2500;

/**
 * startListening(onResult, onError)
 * - Waits for full answer with silence detection
 * - Never call while TTS is playing
 */
function startListening(onResult, onError) {
    if (_listening) { console.warn("[SR] already listening"); return; }
    if (!SR) {
        if (onError) onError("Speech recognition not supported. Please use Chrome or Edge.");
        return;
    }
    _destroyRec();
    _cbResult = onResult; _cbError = onError;
    _finalText = ""; _listening = true;

    _rec = new SR();
    _rec.lang = "en-US";
    _rec.continuous = true;        // FIX A: capture full sentences
    _rec.interimResults = true;    // FIX B: accumulate as user talks
    _rec.maxAlternatives = 1;

    _rec.onresult = (e) => {
        let chunk = "";
        for (let i = e.resultIndex; i < e.results.length; i++) {
            if (e.results[i].isFinal) chunk += e.results[i][0].transcript + " ";
        }
        if (chunk.trim()) {
            _finalText += chunk;
            console.log("[SR] accumulated:", _finalText.trim());
            _resetSilenceTimer();
        }
    };

    _rec.onspeechend = () => _resetSilenceTimer();

    _rec.onerror = (e) => {
        if (e.error === "aborted") return;
        if (e.error === "no-speech") {
            if (_finalText.trim()) { _commit(); return; }
            _done_error("no-speech"); return;
        }
        const map = {
            "not-allowed": "Microphone access denied. Allow mic in browser settings and refresh.",
            "audio-capture": "No microphone detected. Please connect a microphone.",
            "network": "Network error with speech service. Check your connection."
        };
        _done_error(map[e.error] || "Microphone error: " + e.error + ". Please try again.");
    };

    _rec.onend = () => {
        if (!_listening) return;
        if (_finalText.trim()) _commit();
        else _done_error("no-speech");
    };

    setTimeout(() => {
        if (!_listening) return;
        try { _rec.start(); console.log("[SR] started"); }
        catch(e) { _done_error("Microphone is busy. Please try again."); }
    }, 300);
}

function stopListening() {
    _cleanup();
}

function isListening() { return _listening; }

function _resetSilenceTimer() {
    clearTimeout(_silenceTimer);
    _silenceTimer = setTimeout(() => {
        if (_listening && _finalText.trim()) {
            console.log("[SR] silence timeout — committing");
            _commit();
        }
    }, SILENCE_MS);
}

function _commit() {
    const text = _finalText.trim();
    _cleanup();
    if (_cbResult && text) { const cb = _cbResult; _cbResult = null; _cbError = null; cb(text); }
    else { _done_error("no-speech"); }
}

function _done_error(msg) {
    _cleanup();
    if (_cbError) { const cb = _cbError; _cbResult = null; _cbError = null; cb(msg); }
}

function _cleanup() {
    _listening = false;
    clearTimeout(_silenceTimer);
    _silenceTimer = null;
    _destroyRec();
}

function _destroyRec() {
    if (_rec) {
        try { _rec.abort(); } catch(e) {}
        _rec.onresult = _rec.onspeechend = _rec.onerror = _rec.onend = null;
        _rec = null;
    }
}
function logoutUser() {
  localStorage.setItem("justLoggedOut", "true");

  speakAndWait("Redirecting to login page", () => {
    window.location.href = "/index.html";
  });
}

console.log("[speech.js v2] loaded — SR:", !!SR);
