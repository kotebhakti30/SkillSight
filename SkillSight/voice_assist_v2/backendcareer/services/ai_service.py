"""
services/ai_service.py — v3 FULLY FIXED

FIXES THIS VERSION:
  1. Groq 403 fix: urllib was being blocked by Cloudflare WAF.
     Switched to Python `http.client` with proper headers (User-Agent, Accept).
  2. Groq key: still validates correctly (starts with gsk_, len > 20).
  3. Smalltalk: AI now generates genuinely new follow-up each time.
  4. Analyze: richer prompt so AI gives specific, useful feedback.
  5. All JSON parsing hardened.
"""

import re, json, http.client, importlib, sys, os

# ── Key loader ───────────────────────────────────────────────────────────────

def _get_groq_key() -> str:
    try:
        module_name = "voice_assist_v2.backendcareer.config"

        if module_name in sys.modules:
            importlib.reload(sys.modules[module_name])
            config = sys.modules[module_name]
        else:
            from voice_assist_v2.backendcareer import config  # noqa

        key = config.GROQ_API_KEY.strip()

        if key and key.startswith("gsk_") and len(key) > 20:
            print(f"[Groq] Key loaded from config.py (len={len(key)})")
            return key

        if key:
            print(f"[Groq] Key in config.py looks wrong: starts='{key[:8]}' len={len(key)}")

    except Exception as e:
        print(f"[Groq] config load error: {e}")

    env = os.environ.get("GROQ_API_KEY", "").strip()
    if env and env.startswith("gsk_") and len(env) > 20:
        return env

    return ""


# ── HTTP call using http.client (avoids urllib Cloudflare 403) ───────────────

def _call_groq(prompt: str, max_tokens: int = 400) -> str | None:
    key = _get_groq_key()
    if not key:
        print("[Groq] No valid key. Set GROQ_API_KEY in backend/config.py")
        return None

    payload = json.dumps({
        "model": "llama-3.3-70b-versatile",
        "messages": [{"role": "user", "content": prompt}],
        "max_tokens": max_tokens,
        "temperature": 0.6
    })

    headers = {
        "Content-Type":  "application/json",
        "Authorization": f"Bearer {key}",
        # FIX: real browser-like User-Agent avoids Cloudflare 403
        "User-Agent":    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Accept":        "application/json",
    }

    try:
        conn = http.client.HTTPSConnection("api.groq.com", timeout=20)
        conn.request("POST", "/openai/v1/chat/completions",
                     body=payload.encode("utf-8"), headers=headers)
        resp = conn.getresponse()
        raw  = resp.read().decode("utf-8")
        conn.close()

        if resp.status != 200:
            print(f"[Groq] HTTP {resp.status}: {raw[:300]}")
            return None

        data    = json.loads(raw)
        content = data["choices"][0]["message"]["content"].strip()
        print(f"[Groq] ✓ response: {content[:200]}")
        return content

    except Exception as e:
        print(f"[Groq] call error: {e}")
        return None


# ── JSON parser ──────────────────────────────────────────────────────────────

def _parse_json(raw: str) -> dict | None:
    raw = re.sub(r"^```(?:json)?\s*", "", raw, flags=re.MULTILINE)
    raw = re.sub(r"\s*```\s*$",       "", raw, flags=re.MULTILINE).strip()
    try:
        return json.loads(raw)
    except Exception:
        m = re.search(r'\{.*\}', raw, re.DOTALL)
        if m:
            try:
                return json.loads(m.group())
            except Exception:
                pass
    print(f"[Groq] JSON parse failed: {raw!r}")
    return None


# ── Analyze (mock / presentation) ────────────────────────────────────────────

def _groq_analyze(answer: str, question: str) -> dict | None:
    prompt = f"""You are an expert English communication coach for working professionals.

Question asked to the user: {question}
User's spoken answer: {answer}

Give detailed, specific, encouraging feedback. Evaluate:
- Clarity and confidence of expression
- Use of specific examples (Situation-Action-Result method)
- Professional vocabulary
- Filler words (um, uh, like, basically)
- Structure and logical flow

Your feedback must be SPECIFIC to what the user actually said — mention their exact words or content.
Do NOT give generic advice. Reference what they said.

Scoring guide:
- 85-100: Excellent structure, specific examples, professional vocabulary
- 70-84: Good answer, needs more specifics or stronger structure
- 55-69: Adequate, but lacks examples or clear structure
- 35-54: Needs significant improvement in structure or content
- 0-34: Very brief or off-topic answer

Reply ONLY with this exact JSON, no markdown, no extra text:
{{"feedback":"Specific feedback referencing what they said.","score":72,"tips":["Specific tip 1 based on their answer.","Specific tip 2.","Specific tip 3."]}}"""

    raw = _call_groq(prompt, max_tokens=450)
    if not raw:
        return None
    parsed = _parse_json(raw)
    if not parsed:
        return None
    feedback = str(parsed.get("feedback", "")).strip()
    tips     = [str(t).strip() for t in parsed.get("tips", [])][:3]
    try:    score = int(parsed.get("score", 50))
    except: score = 50
    score = max(0, min(score, 100))
    if not feedback:
        return None
    print(f"[Groq] ✓ analyze score={score}")
    return {"feedback": feedback, "score": score, "tips": tips}


# ── Small Talk ───────────────────────────────────────────────────────────────

def _groq_smalltalk(answer: str, question: str) -> dict | None:
    prompt = f"""You are a warm, friendly professional colleague having a genuine small talk conversation at work.

You asked: {question}
The person replied: {answer}

Instructions:
1. Comment warmly and SPECIFICALLY on what they said — mention details from their answer.
2. Ask ONE natural follow-up question that digs deeper into what they just shared.
   The follow-up must be DIRECTLY related to their specific answer, not generic.
   Do NOT ask "Could you tell me more?" — be specific and creative.

Examples of BAD follow-ups (too generic): "Could you tell me more about that?" "That's interesting, what else?"
Examples of GOOD follow-ups: "Oh you mentioned [X] — how did that go?" "That sounds great, did you find it helped with [Y]?"

Reply ONLY with this exact JSON, no markdown:
{{"comment":"Warm specific comment about their answer.","followup":"Specific follow-up question?"}}"""

    raw = _call_groq(prompt, max_tokens=250)
    if not raw:
        return None
    parsed = _parse_json(raw)
    if not parsed:
        return None
    comment  = str(parsed.get("comment",  "")).strip()
    followup = str(parsed.get("followup", "")).strip()
    if not comment or not followup:
        return None
    print(f"[Groq] ✓ smalltalk: {followup[:80]}")
    return {"comment": comment, "followup": followup}


# ── Keyword fallback ─────────────────────────────────────────────────────────

def _has(text, words):
    return [w for w in words if re.search(r'\b' + re.escape(w) + r'\b', text, re.IGNORECASE)]

def _logic_analyze(answer: str, question: str = "") -> dict:
    tl, wc = answer.strip().lower(), len(answer.strip().split())
    score, tips = 50, []

    if wc < 5:
        return {"feedback": "Your answer was too short. Please speak at least 3-4 full sentences.",
                "score": 10,
                "tips": ["Aim for at least 3 full sentences.",
                         "Give a specific example from your experience.",
                         "Use Situation, Action, Result structure."]}

    if wc >= 20: score += 10
    if wc >= 40: score += 10
    if wc >= 60: score +=  5

    fillers = _has(tl, ["um","uh","like","you know","err","hmm","basically","literally"])
    if fillers:
        score -= 10
        tips.append("Reduce filler words: " + ", ".join(fillers) + ".")
    if _has(tl, ["example","instance","specifically","for instance","such as"]):
        score += 10; tips.append("Good — you used examples.")
    if _has(tl, ["result","outcome","achieved","success","improved","increased","reduced","delivered"]):
        score += 10; tips.append("Good — you mentioned outcomes.")
    if _has(tl, ["first","second","third","finally","then","next"]):
        score += 10; tips.append("Good structured answer.")
    if _has(tl, ["led","managed","created","built","launched"]):
        score +=  5; tips.append("Good use of action verbs.")

    score = max(0, min(score, 100))
    if   score >= 85: fb = "Excellent answer — clear, structured, and confident."
    elif score >= 70: fb = "Great answer. Adding specific results would strengthen it."
    elif score >= 55: fb = "Good attempt. Add more examples and a clearer structure."
    elif score >= 35: fb = "Keep practising. Use Situation, Action, Result to structure your answer."
    else:             fb = "Needs more work. Speak in full sentences with a specific example."

    if not tips: tips.append("Keep practising to build confidence and fluency.")
    print(f"[Logic fallback] score={score}")
    return {"feedback": fb, "score": score, "tips": tips}


# ── Public API ────────────────────────────────────────────────────────────────

def analyze_answer(answer: str, question: str = "") -> dict:
    result = _groq_analyze(answer, question)
    if result:
        return result
    print("[Groq] Falling back to keyword logic.")
    return _logic_analyze(answer, question)

def smalltalk_reply(answer: str, question: str = "") -> dict:
    result = _groq_smalltalk(answer, question)
    if result:
        return result
    print("[Groq] Smalltalk fallback.")
    # Fallback gives a generic but passable response
    return {
        "comment":  "That's really interesting, thank you for sharing.",
        "followup": "What was the most memorable part of that experience for you?"
    }
