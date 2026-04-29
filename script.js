let recognition;

/* ---------- START ---------- */

document.addEventListener("DOMContentLoaded", () => {

setupFormSwitching();
setupForms();

/* ---- REMOVE BROWSER AUTOFILL ---- */

setTimeout(() => {

document.getElementById("email").value = "";
document.getElementById("password").value = "";

document.getElementById("signup-name").value = "";
document.getElementById("signup-email").value = "";
document.getElementById("signup-password").value = "";
document.getElementById("confirm-password").value = "";

}, 100);


/* ---- BLOCK AUTOFILL ---- */

document.querySelectorAll("input").forEach(input => {

input.setAttribute("autocomplete","off");

input.addEventListener("focus", () => {
input.value = "";
});

});
});

/* ---------- SPEAK ---------- */

function speak(text,callback=null){

speechSynthesis.cancel();

const msg = new SpeechSynthesisUtterance(text);

msg.lang="en-US";

msg.onend = ()=>{
if(callback) callback();
};

speechSynthesis.speak(msg);

}

/* ---------- INIT VOICE ---------- */
function stopAllVoice() {
  try { if (recognition) recognition.abort(); } catch {}
  window.speechSynthesis.cancel();
}

function initVoice(){
  recognition = new webkitSpeechRecognition();
  recognition.lang="en-US";

  speak("Welcome to SkillSight. Say login or signup.", startListening);
}

/* ---------- LISTEN LOGIN / SIGNUP ---------- */

function startListening(){

recognition.start();

recognition.onresult = (event)=>{

const text = event.results[0][0].transcript.toLowerCase();

handleCommand(text);

};

recognition.onerror = ()=>{
speak("Please say login or signup.",startListening);
};

}

/* ---------- COMMAND ---------- */

function handleCommand(text){

if(text.includes("login")){

switchForm("login");

setTimeout(startLoginVoice,1500);

}

else if(text.includes("signup") || text.includes("sign up")){

switchForm("signup");

setTimeout(startSignupVoice,1500);

}

else{

speak("Please say login or signup.",startListening);

}

}

/* ---------- FORM SWITCH ---------- */

function setupFormSwitching(){

document.getElementById("login-to-signup").onclick=(e)=>{

e.preventDefault();

switchForm("signup");

startSignupVoice();

};

document.getElementById("signup-to-login").onclick=(e)=>{

e.preventDefault();

switchForm("login");

startLoginVoice();

};

}

function switchForm(type){

document.getElementById("login-form").classList.remove("active");
document.getElementById("signup-form").classList.remove("active");

if(type==="login"){

document.getElementById("login-form").classList.add("active");

speak("Login selected");

}

else{

document.getElementById("signup-form").classList.add("active");

speak("Signup selected");

}

}

/* ---------- FORMS ---------- */

function setupForms(){

document.getElementById("login-form").onsubmit = (e)=>{

e.preventDefault();

handleLogin();

};

document.getElementById("signup-form").onsubmit = (e)=>{

e.preventDefault();

handleSignup();

};

}

/* ---------- LOGIN ---------- */

function handleLogin(){

fetch("/login",{

method:"POST",

headers:{
"Content-Type":"application/json"
},

body:JSON.stringify({

email:value("email"),
password:value("password")

})

})

.then(r=>r.json())

.then(data=>{

console.log(data);    

if(data.status==="success"){

const userId = data.user?.id || data.id;

// 🔥 IMPORTANT FIX
const userName =
  data.user?.name ||
  data.user?.email ||
  data.email ||
  "User";

localStorage.setItem("userId", userId);
localStorage.setItem("userName", userName);

speak("Login successful");

setTimeout(()=>{
window.location.href="/categories.html";
},1200);
}

else{

speak("User not found. Please sign up.");

setTimeout(()=>{
switchForm("signup");
startSignupVoice();
},2000);

}

})

.catch(err=>{
console.error(err);
speak("Login error");
});

}

/* ---------- SIGNUP ---------- */

function handleSignup(){

fetch("/signup",{

method:"POST",

headers:{
"Content-Type":"application/json"
},

body:JSON.stringify({

name:value("signup-name"),
email:value("signup-email"),
password:value("signup-password")

})

})

.then(r=>r.json())

.then(data=>{

console.log(data);    

if(data.status==="success"){

const userId = data.user?.id || data.id;
localStorage.setItem("userId", userId);

speak("Signup successful");

setTimeout(()=>{
window.location.href="/categories.html";
},1200);

}

else {

  const msg = (data.message || "").toLowerCase();

  if (msg.includes("already exists")) {

    speak("User already exists. Logging you in", () => {
      // 🔥 OPTIONAL: set userId if backend sends it
      if (data.user?.id) {
        localStorage.setItem("userId", data.user.id);
      }

      window.location.href = "/categories.html";
    });

  } else {
    speak(data.message || "Signup failed");
  }
}

})

.catch(err=>{
console.error(err);
speak("Signup error");
});

}

function value(id){

return document.getElementById(id).value.trim();

}

/* ---------- VOICE FORM FLOW ---------- */

let signupFields=[
{id:"signup-name",prompt:"Please say your name"},
{id:"signup-email",prompt:"Please say your email"},
{id:"signup-password",prompt:"Please say your password"}
];

let loginFields=[
{id:"email",prompt:"Please say your email"},
{id:"password",prompt:"Please say your password"}
];

let activeForm=null;
let currentStep=0;

/* ---------- START SIGNUP ---------- */

function startSignupVoice(){

activeForm=signupFields;
currentStep=0;

askNextField();

}

/* ---------- START LOGIN ---------- */

function startLoginVoice(){

activeForm=loginFields;
currentStep=0;

askNextField();

}

/* ---------- ASK FIELD ---------- */

function askNextField(){

if(currentStep>=activeForm.length){

speak("All fields recorded. Submitting.");

setTimeout(()=>{

if(activeForm===signupFields){
handleSignup();
}else{
handleLogin();
}

},800);

return;

}

const field=activeForm[currentStep];

speak(field.prompt,listenForField);

}

/* ---------- LISTEN FIELD ---------- */

function listenForField(){

recognition = new webkitSpeechRecognition();

recognition.lang="en-US";

recognition.start();

recognition.onresult=(event)=>{

let speech = event.results[0][0].transcript.toLowerCase();

const fieldId = activeForm[currentStep].id;

/* EMAIL FIX */

if(fieldId==="signup-email" || fieldId==="email"){

speech = speech
.replace(/at the rate/g,"@")
.replace(/at/g,"@")
.replace(/dot/g,".")
.replace(/\s+/g,"");

}

document.getElementById(fieldId).value=speech;

currentStep++;

speak("Recorded",()=>{

setTimeout(askNextField,700);

});

};

recognition.onerror = ()=>{
speak("Please repeat",listenForField);
};

}
window.onload = () => {
  const justLoggedOut = localStorage.getItem("justLoggedOut");
  const userId = localStorage.getItem("userId");

  if (justLoggedOut === "true" && userId) {
    const popup = document.getElementById("popupOverlay");
    popup.style.display = "flex";

    setTimeout(() => {
      speak("Logged out. Do you want to jump back in?", () => {
        listenJumpBackCmd();
      });
    }, 500);
  } else {
    // Wait for ANY user interaction before starting voice
    document.addEventListener("click", function startOnce() {
      document.removeEventListener("click", startOnce);
      initVoice();
    }, { once: true });

    document.addEventListener("keydown", function startOnce() {
      document.removeEventListener("keydown", startOnce);
      initVoice();
    }, { once: true });
  }
};

/* ---------- JUMP BACK ---------- */

function jumpBack() {
  try { if (recognition) recognition.abort(); } catch {}
  window.speechSynthesis.cancel();

  localStorage.removeItem("justLoggedOut");

  const popup = document.getElementById("popupOverlay");
  if (popup) popup.style.display = "none";

  window.location.href = "/categories.html";
}

/* ---------- STAY HERE ---------- */

function stayHere() {
  console.log("❌ Staying here");

  try { if (recognition) recognition.abort(); } catch {}

  localStorage.removeItem("justLoggedOut");
  localStorage.removeItem("userId");

  document.getElementById("popupOverlay").style.display = "none";

  speak("Alright. Welcome to SkillSight. Say login or signup.", () => {
    startListening();
  });
}

/* ---------- LISTEN YES / NO ---------- */

function listenJumpBackCmd() {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) return;

  console.log("🎤 Listening for YES/NO...");

  const r = new SR();

  r.lang = "en-US";
  r.interimResults = false;
  r.continuous = true; // 🔥 IMPORTANT FIX

  // 🔥 start after delay (after speech ends)
  setTimeout(() => {
    try { r.start(); } catch {}
  }, 600);

  r.onresult = (e) => {
    const said = e.results[e.results.length - 1][0].transcript.toLowerCase();
    console.log("✅ Heard:", said);

    // 🔥 STOP mic once we got answer
    try { r.stop(); } catch {}

    if (
      said.includes("yes") ||
      said.includes("yeah") ||
      said.includes("ok") ||
      said.includes("okay") ||
      said.includes("sure")
    ) {
      window.speechSynthesis.cancel();
      jumpBack();
      return;
    }

    if (
      said.includes("no") ||
      said.includes("nope") ||
      said.includes("stay")
    ) {
      stayHere();
      return;
    }

    // 🔁 unclear → retry
    speak("Please say yes or no", listenJumpBackCmd);
  };

  r.onerror = (e) => {
    console.log("Mic error:", e.error);
    speak("Please say yes or no", listenJumpBackCmd);
  };

  // 🔥 KEY FIX: restart if mic stops early
  r.onend = () => {
    const popup = document.getElementById("popupOverlay");

    if (popup && popup.style.display === "flex") {
      console.log("🔁 Restarting mic...");
      setTimeout(() => listenJumpBackCmd(), 500);
    }
  };
}