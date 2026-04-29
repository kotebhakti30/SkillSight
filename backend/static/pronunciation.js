/* ============================================================
SKILLSIGHT — Voice-First Pronunciation Practice
============================================================ */

/* 🔥 FIX: TTS VARIABLES FIRST (IMPORTANT) */
let _ttsQueue = [];
let _ttsBusy  = false;

/* 🔥 FETCH FROM BACKEND */
async function fetchWordsFromBackend() {
  try {
    const words = [];
    for (let i = 0; i < 20; i++) {
      const res = await fetch("/api/get-word");
      const data = await res.json();

      // 🔥 ADD HERE
      console.log(data.stress);
      console.log(data.tip);

      words.push(data);
    }
    return words;
  } catch (err) {
    console.error("Error fetching words:", err);
    return [];
  }
}

/* ───────── STATE ───────── */
let sessionWords   = [];
let wordIndex      = 0;
let sessionResults = [];
let sessionsData = [];
let currentScreen  = "welcome";

let cmdRecognition   = null;
let pronRecognition  = null;
let isListeningCmd   = false;
let isRecordingPron  = false;

let gotResult = false;
let currentListener = null;
let micHandled = false;   // 🔥 NEW
let hasRecordedForWord = false;

function abortPronCheck() {
  if (pronRecognition) {
    try { pronRecognition.abort(); } catch {}
    pronRecognition = null;
  }
  isRecordingPron = false;
}

/* ───────── DOM ───────── */
const $screen = {
welcome:  document.getElementById("welcomeScreen"),
sessions: document.getElementById("sessionsScreen"),
detail:   document.getElementById("sessionDetailScreen"),
practice: document.getElementById("practiceScreen"),
summary:  document.getElementById("summaryScreen")
};

const subtitleEl   = document.getElementById("subtitle");
const wordEl       = document.getElementById("word");
const feedbackBox  = document.getElementById("feedbackBox");
const feedbackIcon = document.getElementById("feedbackIcon");
const feedbackText = document.getElementById("feedbackText");

window.onload = () => {
  setTimeout(() => {
    _activateOnce();   // 🔥 directly call your existing function
  }, 500);
};

/* ───────── SCREEN ROUTER ───────── */
function showScreen(name) {
Object.values($screen).forEach(s => (s.style.display = "none"));
$screen[name].style.display = "block";
currentScreen = name;
}

/* ───────── SPEECH SYSTEM (UNCHANGED) ───────── */
function speak(text, onEnd) {
_ttsQueue.push({ text, onEnd: onEnd || null });
_ttsDrain();
}

function _ttsDrain() {
if (_ttsBusy || _ttsQueue.length === 0) return;

const { text, onEnd } = _ttsQueue.shift();
_ttsBusy = true;

subtitleEl.innerText = text;

const u = new SpeechSynthesisUtterance(text);
u.lang  = "en-US";

u.onend = () => {
_ttsBusy = false;
if (onEnd) onEnd();
_ttsDrain();
};

speechSynthesis.cancel();
speechSynthesis.speak(u);
}

function cancelSpeech() {
_ttsQueue = [];
_ttsBusy  = false;
speechSynthesis.cancel();
}

/* ───────── COMMAND SYSTEM ───────── */
function startCmdListen() {
  if (isListeningCmd || isRecordingPron) return;
  if (currentScreen !== "practice") return;

  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) return;

  isListeningCmd = true;

  cmdRecognition = new SR();
  cmdRecognition.lang = "en-US";
  cmdRecognition.continuous = false;

cmdRecognition.onresult = (e) => {

  isListeningCmd = false;

  const said = e.results[0][0].transcript.toLowerCase();

  handleCmd(said);   // 🔥 THIS is enough
};

  cmdRecognition.onend = () => {
    isListeningCmd = false;
    if (currentScreen === "practice" && !isRecordingPron) {
      setTimeout(startCmdListen, 400);
    }
  };

  try {
    cmdRecognition.start();
  } catch {
    isListeningCmd = false;
  }
}

function stopCmdListen() {
isListeningCmd = false;
if (cmdRecognition) {
try { cmdRecognition.abort(); } catch {}
cmdRecognition = null;
}
}

function handleCmd(said) {
    if (
    said.includes("logout") ||
    said.includes("log out") ||
    said.includes("sign out")
  ) {
    cancelSpeech();
    stopAllListening();
    abortPronCheck();

    speak("Logging you out", logoutUser);
    return;
  }
  if (said.includes("play")) playWord(() => startCmdListen());

  else if (said.includes("record")) startPronCheck();

  else if (said.includes("next")) doNext();

  else if (said.includes("previous word")) doBack();

  else if (said.includes("stop") || said.includes("end")) {
    endSession();
  }

  else if (said.includes("back")) {
  if (currentScreen === "welcome") {
    goToCategoriesPage();   // main page → categories
  } else {
    goToPronunciationPage(); // inside session → pronunciation main
  }
}

  else startCmdListen();
}
async function endSession() {
  console.log("FINAL SESSION RESULTS:", sessionResults);
  cancelSpeech();
  stopCmdListen();
  abortPronCheck();

  const correct = sessionResults.filter(r => r.correct).length;
  const total = sessionResults.length;

  // 🔥 SAVE TO DATABASE
  await saveSession(correct, total);

  showScreen("summary");

  document.getElementById("summaryStats").innerHTML =
    `${correct} out of ${total} correct`;

speak(
  "Session complete. You got " + correct + " out of " + total +
  ". Say new session to practice again, say view sessions to see your history, or say back to return to the main menu.",
  () => listenSummaryCmd()
);
}

/* ───────── NEW SESSION (DB BASED) ───────── */
async function startNewSession() {
  hasRecordedForWord = false;
cancelSpeech();
stopCmdListen();
abortPronCheck();

sessionWords   = await fetchWordsFromBackend();
wordIndex      = 0;
sessionResults = [];

if (!sessionWords.length) {
speak("Could not load words. Please try again.");
return;
}

showScreen("practice");

const first = sessionWords[0].word;
wordEl.innerText = first;

speak(
"Session started. I will say a word. You can say play to hear it. Record to try saying it. Next to move ahead. Previous word to go back. Stop to end the session. Back to go to Pronunciation page",
() => {
speak("The first word is: " + first, () => startCmdListen());
}
);
} 

/* ───────── PLAY WORD ───────── */
function playWord(onDone) {
const w = sessionWords[wordIndex];
speak("The word is: " + w.word + ".", onDone);
}

/* ───────── NAVIGATION ───────── */
async function doNext() {
  hasRecordedForWord = false;
  cancelSpeech();
  stopCmdListen();

  try {
    // 🔥 fetch ONE new word from backend
    const res = await fetch("/api/get-word");
    const data = await res.json();

    // update UI
    wordEl.innerText = data.word;

    // update session tracking
    sessionWords.push(data);
    wordIndex = sessionWords.length - 1;

    speak("Next word: " + data.word + ".", () => startCmdListen());

  } catch (err) {
    console.error("Error fetching next word:", err);
    speak("Could not load next word.", () => startCmdListen());
  }
}

function doBack() {
  cancelSpeech();
  stopCmdListen();

  // 🔥 check if previous exists
  if (wordIndex > 0) {
    wordIndex--;

    const w = sessionWords[wordIndex];
    wordEl.innerText = w.word;

    speak("Going back. The word is: " + w.word + ".", () => startCmdListen());
  } else {
    speak("This is the first word. Cannot go back.", () => startCmdListen());
  }
}

/* ───────── PRON CHECK ───────── */
function startPronCheck() {
  if (isRecordingPron) return;

  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;

  if (!SR) {
    speak("Your browser does not support voice recognition. Use Chrome.");
    return;
  }

  cancelSpeech();
  stopCmdListen();

  isRecordingPron = true;

  recordBtn.style.display = "none";
  stopRecordBtn.style.display = "inline-block";

  // 🔥 IMPORTANT: speak first, then start mic
  speak("Recording. Say the word now.", () => {
    setTimeout(() => openMic(), 400); // delay is important
  });
}

function openMic() {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;

  gotResult = false;

  pronRecognition = new SR();
  pronRecognition.lang = "en-US";
  pronRecognition.continuous = false;
  pronRecognition.interimResults = false;
  pronRecognition.maxAlternatives = 3;

  const target = sessionWords[wordIndex].word.toLowerCase();

  pronRecognition.onresult = (e) => {
    gotResult = true;

    const spoken = e.results[0][0].transcript.toLowerCase();

    closeMic();

    let isCorrect = spoken.includes(target);

    // ✅ ALWAYS PUSH RESULT
    if (!hasRecordedForWord) {
  sessionResults.push({
    word: target,
    correct: isCorrect
  });
  hasRecordedForWord = true;
}

    if (isCorrect) {
      speak("Perfect pronunciation", () => {
        setTimeout(doNext, 800);
      });
    } else {
      speak("Not quite correct. Try again or say next.", () => startCmdListen());
    }
  };

  pronRecognition.onerror = () => {
    closeMic();

    // ✅ STILL STORE RESULT (failed attempt)
    if (!hasRecordedForWord) {
  sessionResults.push({
    word: target,
    correct: false
  });
  hasRecordedForWord = true;
}

    startCmdListen();
  };

  pronRecognition.onend = () => {
    if (gotResult) return;

    closeMic();

    // ✅ CRITICAL FIX → STORE EVEN IF USER SAID NOTHING
   if (!gotResult && !hasRecordedForWord) {
  sessionResults.push({
    word: target,
    correct: false
  });
  hasRecordedForWord = true;
}

    startCmdListen();
  };

  try {
    pronRecognition.start();
  } catch (e) {
    closeMic();

    if (!hasRecordedForWord) {
  sessionResults.push({
    word: target,
    correct: isCorrect
  });
  hasRecordedForWord = true;
}

    startCmdListen();
  }
}

function closeMic() {
  isRecordingPron = false;

  recordBtn.style.display = "inline-block";
  stopRecordBtn.style.display = "none";

  if (pronRecognition) {
    try { pronRecognition.abort(); } catch {}
    pronRecognition = null;
  }
}

/* ───────── END SESSION ───────── */
function goHome() {
  cancelSpeech();
  stopAllListening();   // already good
  abortPronCheck();

  showScreen("welcome");

  setTimeout(() => {
    speak(
      "Welcome to Pronunciation Practice. Say new session or previous sessions or say back to go to the categories page.",
      () => {
        setTimeout(() => listenWelcomeCmd(), 400);
      }
    );
  }, 300);
}
function listenWelcomeCmd() {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) return;

  stopAllListening();

  const r = new SR();

  r.lang = "en-US";
  r.interimResults = false;

  r.onresult = (e) => {
  const said = e.results[0][0].transcript.toLowerCase();
  if (
  said.includes("logout") ||
  said.includes("log out") ||
  said.includes("sign out")
) {
  speak("Logging you out", logoutUser);
  return;
}
  console.log("Welcome heard:", said);

  if (said.includes("new")) {
    stopAllListening();
    startNewSession();
    return;
  }

  if (said.includes("back") || said.includes("go back") || said.includes("exit ")) {
  stopAllListening();
  window.location.href = "/categories.html";
  return;
}

  if (said.includes("previous")) {
      stopAllListening();
      renderSessions();
      return;
    }
  };

  r.onend = () => {
    if (currentScreen === "welcome") {
      setTimeout(() => listenWelcomeCmd(), 500);
    }
  };

  try { r.start(); } catch {}
}
function stopAllListening() {
  try { if (cmdRecognition) cmdRecognition.abort(); } catch {}
  try { if (pronRecognition) pronRecognition.abort(); } catch {}
  try { if (window.sessionRec) window.sessionRec.abort(); } catch {}

  cmdRecognition = null;
  pronRecognition = null;
  window.sessionRec = null;   // 🔥 IMPORTANT FIX
}

function getSessions() {
  try {
    return JSON.parse(localStorage.getItem("skillsight_sessions") || "[]");
  } catch {
    return [];
  }
}

async function renderSessions() {
  stopAllListening();
  cancelSpeech();
  stopCmdListen();

  showScreen("sessions");

  try {
    const userId = localStorage.getItem("userId");
    const res = await fetch(`/api/get-sessions?userId=${userId}`);
    const sessions = await res.json();

    // ✅ STORE GLOBALLY
    sessionsData = sessions;

    if (sessions.length === 0) {
      sessionsList.innerHTML = "<p>No previous sessions available.</p>";

      speak(
        "You have no previous sessions. Say new session to start practicing, or say back to return to the main menu.",
        () => setTimeout(() => listenSessionsCmd(), 400)
      );
      return;
    }

    // ✅ UI
    sessionsList.innerHTML = sessions.map((s, i) =>
      `<div class="session-item" data-index="${i}">
        <div class="session-header">
          <h3>Session ${i + 1}</h3>
          <p>${s.correct} / ${s.total}</p>
        </div>

        <div class="session-details" style="display:none;">
          ${
            s.results && s.results.length > 0
              ? s.results.map(r =>
                  `<div class="word-result ${r.correct ? "correct" : "incorrect"}">
                    <span>${r.word}</span>
                    <span>${r.correct ? "✅" : "❌"}</span>
                  </div>`
                ).join("")
              : "<p>Detailed word results not available</p>"
          }
        </div>
      </div>`
    ).join("");

    // ✅ CLICK HANDLER
    document.querySelectorAll(".session-item").forEach(el => {
      el.addEventListener("click", () => {
        const index = el.dataset.index;
        openSessionByIndex(index);
      });
    });

    // 🔊 SUMMARY
    const top = sessions.map((s, i) =>
      `Session ${i + 1}: ${s.correct} out of ${s.total}`
    ).join(". ");

    if (sessions.length > 5) {
      speak("You have " + sessions.length + " sessions.");
    }

    speak(
      "Here are your previous sessions. " + top +
      ". Say session one, session two, or say back.",
      () => setTimeout(() => listenSessionsCmd(), 700)
    );

  } catch (err) {
    console.error(err);

    sessionsList.innerHTML = "<p>Error loading sessions.</p>";

    speak(
      "Error loading sessions. Say back to return to the main menu.",
      () => setTimeout(() => listenSessionsCmd(), 400)
    );
  }
}
function renderSessionDetail(s) {
  showScreen("detail");

  document.getElementById("sessionDetailTitle").innerText =
    "Session Details";

  // ⚠️ If no results
  if (!s.results || s.results.length === 0) {
    document.getElementById("sessionDetailContent").innerHTML =
      `<p>${s.correct} out of ${s.total} correct</p>
       <p>Detailed word results not available.</p>`;

    speak(`You scored ${s.correct} out of ${s.total}`);
    return;
  }

  // ✅ Separate words
  let correctWords = [];
  let wrongWords = [];

  s.results.forEach(r => {
    if (r.correct) correctWords.push(r.word);
    else wrongWords.push(r.word);
  });

  // ✅ UI
  document.getElementById("sessionDetailContent").innerHTML =
    `<p><strong>${s.correct} / ${s.total} correct</strong></p>` +
    s.results.map(r =>
      `<div class="word-result ${r.correct ? "correct" : "incorrect"}">
        <span>${r.word}</span>
        <span>${r.correct ? "✅" : "❌"}</span>
      </div>`
    ).join("");

  // ✅ 🔥 IMPROVED VOICE
  let voiceText = `Session details. You scored ${s.correct} out of ${s.total}. `;

  if (correctWords.length > 0) {
    voiceText += "Correct words are: " + correctWords.join(", ") + ". ";
  }

  if (wrongWords.length > 0) {
    voiceText += "Incorrect words are: " + wrongWords.join(", ") + ".";
  }

  speak(voiceText);
}

function listenSummaryCmd() {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) return;

  stopAllListening();

  const r = new SR();
  r.lang = "en-US";
  r.interimResults = false;

  r.onresult = (e) => {
    const said = e.results[0][0].transcript.toLowerCase();
    if (
  said.includes("logout") ||
  said.includes("log out") ||
  said.includes("sign out")
) {
  speak("Logging you out", logoutUser);
  return;
}

    if (said.includes("new")) {
      startNewSession();
    }
    else if (said.includes("view") || said.includes("session")) {
      renderSessions();
    }
    else if (said.includes("back") || said.includes("menu")) {
      goHome();
    }
    else {
      listenSummaryCmd(); // retry
    }
  };

  try { r.start(); } catch {}
}

function listenSessionsCmd() {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) return;

  stopAllListening();  // 🔥 important

  const r = new SR();
  window.sessionRec = r;

  r.lang = "en-US";
  r.interimResults = false;

  r.onresult = (e) => {
  const said = e.results[0][0].transcript.toLowerCase();
  if (
  said.includes("logout") ||
  said.includes("log out") ||
  said.includes("sign out")
) {
  speak("Logging you out", logoutUser);
  return;
}
  console.log("Sessions heard:", said);

  if (said.includes("new")) {
    stopAllListening();
    startNewSession();
    return;
  }

  if (said.includes("back")) {
    stopAllListening();
    goHome();
    return;
  }

  // 🔥 SESSION NUMBER VOICE
  const map = {
    "one": 0, "1": 0, "first": 0,
    "two": 1, "2": 1, "second": 1,
    "three": 2, "3": 2, "third": 2,
    "four": 3, "4": 3,
    "five": 4, "5": 4
  };

for (let key in map) {
  if (said.includes(key) && sessionsData[map[key]]) {
    openSessionByIndex(map[key]);   // 🔥 USE YOUR FUNCTION
    return;
  }
}
};

  r.onend = () => {
    if (currentScreen === "sessions") {
      setTimeout(() => listenSessionsCmd(), 500);
    }
  };

  try { r.start(); } catch {}
}
async function saveSession(correct, total) {
  try {
    const userId = localStorage.getItem("userId");  // 🔥 ADD THIS

    await fetch("/api/save-session", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
body: JSON.stringify({
  userId,
  module: "pronunciation",
  game: "practice",
  correct,
  total,
  results: sessionResults   // 🔥 THIS IS THE KEY
})
    });
  } catch (err) {
    console.error("Error saving session:", err);
  }
}
function openSessionByIndex(index) {
  const el = document.querySelector(`.session-item[data-index="${index}"]`);
  if (!el) return;

  const s = sessionsData[index];
  const detail = el.querySelector(".session-details");

  // open dropdown
  detail.style.display = "block";

  if (!s.results || s.results.length === 0) {
    speak(`Session ${index + 1}. You scored ${s.correct} out of ${s.total}`);
    return;
  }

  let correctWords = [];
  let wrongWords = [];

  s.results.forEach(r => {
    if (r.correct) correctWords.push(r.word);
    else wrongWords.push(r.word);
  });

  let voiceText = `Session ${index + 1}. You scored ${s.correct} out of ${s.total}. `;

  if (correctWords.length) {
    voiceText += "Correct words are: " + correctWords.join(", ") + ". ";
  }

  if (wrongWords.length) {
    voiceText += "Incorrect words are: " + wrongWords.join(", ") + ".";
  }

  speak(voiceText);
}
/* ───────── BUTTONS ───────── */
document.getElementById("backBtnn").onclick = goToCategoriesPage;

document.getElementById("newSessionBtn").onclick = startNewSession;

document.getElementById("playBtn").onclick = () => {
  if (currentScreen === "practice") playWord(() => startCmdListen());
};

document.getElementById("nextBtn").onclick = () => {
  if (currentScreen === "practice") doNext();
};

document.getElementById("backWordBtn").onclick = () => {
  if (currentScreen === "practice") doBack();
};

document.getElementById("recordBtn").onclick = () => {
  if (currentScreen === "practice") startPronCheck();
};

document.getElementById("stopRecordBtn").onclick = () => {
  abortPronCheck();
  speak("Recording stopped.", () => startCmdListen());
};
document.getElementById("backBtn").onclick = goToPronunciationPage;

document.getElementById("backToWelcomeBtn").onclick = goHome;
document.getElementById("backToSessionsBtn").onclick = renderSessions;

document.getElementById("stopSessionBtn").onclick = endSession;

document.getElementById("newSessionFromSummaryBtn").onclick = startNewSession;
document.getElementById("viewSessionsFromSummaryBtn").onclick = renderSessions;
document.getElementById("prevSessionBtn").onclick = renderSessions;
function goToCategoriesPage() {
  cancelSpeech();
  stopAllListening();
  abortPronCheck();

  window.location.href = "/categories.html";
}

function goToPronunciationPage() {
  cancelSpeech();
  stopAllListening();
  abortPronCheck();

  window.location.href = "/pronunciation";
}

/* ───────── INIT ───────── */
let _activated = false;

function _activateOnce() {
  if (_activated) return;
  _activated = true;

  document.removeEventListener("pointerdown", _activateOnce);
  document.removeEventListener("keydown", _activateOnce);

  // unlock speech
  speechSynthesis.cancel();
  speechSynthesis.speak(new SpeechSynthesisUtterance(""));

  // 🔥 FIRST TIME → WELCOME (NOT goHome)
  setTimeout(() => {
    showScreen("welcome");

    speak(
      "Welcome to Pronunciation Practice. Say new session to begin practicing, or say previous sessions to review your history or say back to go to the categories page.",
      () => listenWelcomeCmd()
    );
  }, 200);
}
function logoutUser() {
  cancelSpeech();
  stopAllListening();
  abortPronCheck();

  localStorage.setItem("justLoggedOut", "true");

    speak("Redirecting to login page", () => {
    window.location.href = "/index.html";
  });
}
document.addEventListener("pointerdown", _activateOnce);
document.addEventListener("keydown", _activateOnce);