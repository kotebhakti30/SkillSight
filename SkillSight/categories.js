/* ---------- SPEAK FUNCTION ---------- */
let recognition;
let isListening = false;
function speak(text, callback) {
  window.speechSynthesis.cancel();

  const speech = new SpeechSynthesisUtterance(text);

  speech.onend = function () {
    if (callback) callback();
  };

  window.speechSynthesis.speak(speech);
}

/* ---------- PAGE LOAD ---------- */

document.addEventListener("DOMContentLoaded", function(){

console.log("Categories page loaded");


/* Button click navigation */

document.getElementById("pronunciation")?.addEventListener("click", ()=>{
window.location.href = "/backend/templates/pronunciation.html";
});

document.getElementById("career")?.addEventListener("click", ()=>{
window.location.href = "/career";
});

document.getElementById("fun")?.addEventListener("click", ()=>{
window.location.href = "/fun";
});

/* Speak categories */

setTimeout(()=>{

speak(
"Welcome to the categories page. Available categories are Pronunciation, Work and Career, and Fun Learning Zone. Please say the category name.",
listenCategory
);

},1500);

});

/* ---------- VOICE RECOGNITION ---------- */

function listenCategory(){

  if (isListening) return; // 🔥 prevent duplicate mic

  recognition = new webkitSpeechRecognition();
  recognition.lang = "en-US";
  recognition.continuous = false;

  isListening = true;

  recognition.start();

  recognition.onresult = (event)=>{

    isListening = false;

    let speech = event.results[0][0].transcript.toLowerCase();
    console.log("User said:", speech);

    // 🔥 LOGOUT
    if (
      speech.includes("logout") ||
      speech.includes("log out") ||
      speech.includes("sign out")
    ) {
      speak("Logging you out", logoutUser);
      return;
    }

    if(speech.includes("pronunciation") || speech.includes("pronounce")){
      speak("Opening pronunciation", () => {
        window.location.href = "/backend/templates/pronunciation.html";
      });
      return;
    }

    else if(speech.includes("career") || speech.includes("work")){
      speak("Opening work and career", () => {
        window.location.href = "/career";
      });
      return;
    }

    else if(speech.includes("fun") || speech.includes("learning")){
      speak("Opening fun learning zone", () => {
        window.location.href = "/fun";
      });
      return;
    }

    // 🔁 retry
    speak(
      "I did not understand. Please say pronunciation, work and career, or fun learning zone.",
      listenCategory
    );
  };

  recognition.onerror = ()=>{
    isListening = false;
    speak("Please repeat the category.", listenCategory);
  };

  recognition.onend = ()=>{
    isListening = false;
  };
}

function logoutUser() {
  localStorage.setItem("justLoggedOut", "true");

  speak("Redirecting to login page", () => {
    window.location.href = "/index.html";
  });
}