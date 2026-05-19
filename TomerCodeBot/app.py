import io
import json
import os
import re
import time
import zipfile

from pypdf import PdfReader

from groq import Groq
from dotenv import load_dotenv

load_dotenv()
_groq_client = Groq(api_key=os.getenv("GROQ_API_KEY"))

SKIP_DIRS = {"bin", "obj", ".git"}


def extract_pdf_text(pdf_bytes: bytes) -> str:
    reader = PdfReader(io.BytesIO(pdf_bytes))
    return "\n".join(page.extract_text() or "" for page in reader.pages)


def extract_zip(zip_bytes: bytes) -> dict[str, str]:
    files = {}
    with zipfile.ZipFile(io.BytesIO(zip_bytes)) as zf:
        for name in zf.namelist():
            parts = set(name.replace("\\", "/").split("/"))
            if parts & SKIP_DIRS:
                continue
            if name.endswith(".cs"):
                files[name] = zf.read(name).decode("utf-8", errors="replace")
    return files


def strip_json_fences(text: str) -> str:
    text = text.strip()
    text = re.sub(r"^```(?:json)?\s*", "", text)
    text = re.sub(r"\s*```$", "", text)
    return text.strip()


BASE_SYSTEM_PROMPT = """You are grading a student submission for the HIT "Design Patterns" course (lecturer: Guy Ronen) in Israel.
Analyze the C# project files and return ONLY a valid JSON object — no markdown, no backticks, no explanation.

GRADING PHILOSOPHY:
- You are a university course instructor, NOT a senior developer doing a production code review.
- CRITICAL ASSUMPTION: Assume the application compiles and runs correctly unless you find an obvious, clear bug (e.g., null reference with no guard, infinite loop, missing required method). Do NOT deduct for code that looks imperfect but would likely work at runtime.
- Grade generously: a working student solution that demonstrates understanding deserves high marks even if imperfect.
- Give full marks if the requirement is met, even if you would have implemented it differently.
- Reserve deductions for CLEAR, SIGNIFICANT violations — not minor style preferences.
- A working feature that is slightly incomplete is worth 80-90% of its points, not 50%.
- When in doubt between two scores, always pick the higher one.

Grade the project on these 5 criteria (60 points total):

1. functional_scope (20 pts): ASSUME THE APP RUNS. Focus on whether the required features are present in the code structure, not whether every line is perfect. Deduct only for clearly missing required features. A project that appears to implement most requirements should score 15-18/20.
2. design_patterns (20 pts): Does the code show understanding of design patterns and OOP? Look for intent, not perfection. Proper use of classes, inheritance, interfaces earns high marks. If patterns are attempted and mostly correct, score 16-20/20.
3. coding_standards (5 pts): Are variable/method names meaningful? Are obvious magic numbers avoided? Is encapsulation reasonable? Do NOT deduct for minor imperfections.
4. submission_proc (5 pts): Is the namespace and project structure reasonable for a student project? Give full marks unless there is a clear violation.
5. tech_utilization (10 pts): Does the code use C# features appropriately? Generics, properties, collections used correctly earns high marks.

DO NOT grade the accompanying document — it is reviewed manually."""

ASSIGNMENT_ADDON = """

IMPORTANT — ASSIGNMENT-SPECIFIC INSTRUCTIONS:
The assignment instructions are provided below. You MUST:
1. Grade functional_scope based on what was ACTUALLY required — not generic criteria.
2. Identify any sections that explicitly ALLOW AI assistance. Do NOT penalize the student for code in those sections, even if it looks AI-generated.
3. Ignore features not mentioned in the assignment when deducting points.
4. In your feedback, reference specific requirements from the assignment by name.

=== ASSIGNMENT INSTRUCTIONS ===
{assignment_text}
=== END ASSIGNMENT INSTRUCTIONS ==="""

JSON_SCHEMA = """
STRICT LENGTH LIMITS (to ensure valid JSON):
- Each "feedback" value: maximum 300 characters, plain text, no newlines, no quotes inside.
- Each "issues" entry: maximum 120 characters.
- "original_snippet" and "suggested_fix": maximum 8 lines each, no unescaped quotes or backslashes.
- Include at most 10 files in the "files" array (prioritize files with the most issues).

Return this EXACT JSON structure and nothing else:
{
  "ai_score": <integer sum of all 5 scores>,
  "ai_score_max": 60,
  "accompanying_doc": {"pending_manual_review": true, "max": 40},
  "categories": {
    "functional_scope":  {"score": <0-20>, "max": 20, "feedback": "<max 300 chars>"},
    "design_patterns":   {"score": <0-20>, "max": 20, "feedback": "<max 300 chars>"},
    "coding_standards":  {"score": <0-5>,  "max": 5,  "feedback": "<max 300 chars>"},
    "submission_proc":   {"score": <0-5>,  "max": 5,  "feedback": "<max 300 chars>"},
    "tech_utilization":  {"score": <0-10>, "max": 10, "feedback": "<max 300 chars>"}
  },
  "files": [
    {
      "filename": "<filename.cs>",
      "issues": ["<issue, max 120 chars>"],
      "original_snippet": "<max 8 lines>",
      "suggested_fix": "<max 8 lines>"
    }
  ]
}"""


MAX_LINES_PER_FILE = 80
MAX_FILES = 15


def _truncate(content: str, max_lines: int = MAX_LINES_PER_FILE) -> str:
    lines = content.splitlines()
    if len(lines) <= max_lines:
        return content
    kept = lines[:max_lines]
    kept.append(f"... [{len(lines) - max_lines} more lines truncated]")
    return "\n".join(kept)


def _select_files(files: dict[str, str]) -> dict[str, str]:
    if len(files) <= MAX_FILES:
        return files
    # Prefer files with more content (likely more logic), skip Designer/Resource files
    skip_patterns = ("designer", "resource", "assemblyinfo", ".g.", ".designer.")
    primary = {k: v for k, v in files.items()
               if not any(p in k.lower() for p in skip_patterns)}
    selected = sorted(primary, key=lambda k: -len(primary[k]))[:MAX_FILES]
    return {k: files[k] for k in selected}


def build_prompt(files: dict[str, str], assignment_text: str = "") -> str:
    system = BASE_SYSTEM_PROMPT
    if assignment_text.strip():
        system += ASSIGNMENT_ADDON.format(assignment_text=assignment_text)
    system += JSON_SCHEMA
    selected = _select_files(files)
    skipped = len(files) - len(selected)
    parts = [system]
    if skipped:
        parts.append(f"\n\n[NOTE: {skipped} smaller/generated files were omitted to fit context limits.]")
    for filename, content in selected.items():
        parts.append(f"\n\n=== FILE: {filename} ===\n{_truncate(content)}")
    return "\n".join(parts)


def analyze_with_gemini(files: dict[str, str], assignment_text: str = "", status_cb=None) -> dict:
    prompt = build_prompt(files, assignment_text)
    for attempt in range(3):
        try:
            response = _groq_client.chat.completions.create(
                model="llama-3.3-70b-versatile",
                messages=[{"role": "user", "content": prompt}],
                response_format={"type": "json_object"},
                temperature=0.1,
            )
            raw = strip_json_fences(response.choices[0].message.content)
            return json.loads(raw)
        except json.JSONDecodeError as e:
            return {"error": f"JSON parse error: {e}", "raw_response": response.choices[0].message.content}
        except Exception as e:
            msg = str(e)
            if "rate" in msg.lower() or "429" in msg:
                wait = 65
                if status_cb:
                    for i in range(wait, 0, -1):
                        status_cb(f"מגבלת API — ממתין {i} שניות לפני ניסיון חוזר ({attempt + 1}/3)...")
                        time.sleep(1)
                else:
                    time.sleep(wait)
            else:
                return {"error": msg}
    return {"error": "חריגה ממגבלת API לאחר 3 ניסיונות. נסה שוב בעוד מספר דקות."}


import streamlit as st

st.set_page_config(page_title="בודק קוד HIT | Design Patterns", layout="wide")

with st.sidebar:
    st.title("🎓 בודק קוד — HIT")
    st.markdown("**קורס:** Design Patterns")
    st.markdown("**מרצה:** גיא רונן")
    st.divider()
    st.markdown("""
**הוראות שימוש:**
1. העלה PDF של הנחיית התרגיל (מומלץ)
2. צור ZIP של תיקיית הפרויקט והעלה
3. לחץ **"נתח פרויקט"**
4. קרא את ההערות ותקן לפני ההגשה

**עם PDF הנחיה:**
הבודק ינתח לפי הדרישות הספציפיות ויתעלם מחלקים שמאפשרים שימוש ב-AI.

**שים לב:**
הציון מתוך **60 בלבד**.
תיעוד מלווה (40 נק') נבדק ידנית ע"י גיא רונן.
""")

st.title("בודק קוד — Design Patterns")
st.caption("ניתוח אוטומטי בעזרת Groq · Llama 3.3 70B")

uploaded_pdf = st.file_uploader("העלה הנחיית תרגיל (PDF) — אופציונלי אך ממליץ", type=["pdf"])
uploaded_file = st.file_uploader("העלה קובץ ZIP של הפרויקט", type=["zip"])

analyze_clicked = st.button(
    "נתח פרויקט",
    type="primary",
    disabled=(uploaded_file is None),
)

if analyze_clicked and uploaded_file is not None:
    status_text = st.empty()
    with st.spinner("מחלץ קבצים ומנתח עם Groq · Llama 3.3 70B..."):
        files = extract_zip(uploaded_file.read())

        if not files:
            st.warning("לא נמצאו קבצי .cs בקובץ ה-ZIP. ודא שהפרויקט כולל קוד C# ואינו מכיל רק תיקיות bin/obj.")
            st.stop()

        assignment_text = extract_pdf_text(uploaded_pdf.read()) if uploaded_pdf else ""
        result = analyze_with_gemini(files, assignment_text, status_cb=lambda msg: status_text.info(msg))
    status_text.empty()

    if "error" in result:
        st.error(f"שגיאה: {result['error']}")
        if "raw_response" in result:
            with st.expander("תגובה גולמית מ-Gemini (לאבחון)"):
                st.text(result["raw_response"])
        st.stop()

    st.session_state["result"] = result

if "result" in st.session_state:
    result = st.session_state["result"]

    # --- Score Card ---
    score = result.get("ai_score", 0)
    score_max = result.get("ai_score_max", 60)

    if score >= 48:
        bg, fg, label = "#d4edda", "#155724", "מצוין"
    elif score >= 36:
        bg, fg, label = "#fff3cd", "#856404", "לשיפור"
    else:
        bg, fg, label = "#f8d7da", "#721c24", "דורש תיקונים"

    estimated_total = score + 40

    col_est, col_doc = st.columns([1, 2])
    with col_est:
        st.markdown(f"""
<div style="background:{bg};padding:24px;border-radius:12px;text-align:center;">
  <div style="color:{fg};font-size:4rem;font-weight:bold;line-height:1">~{estimated_total}</div>
  <div style="color:{fg};font-size:1.1rem">/ 100 ציון משוער</div>
  <div style="color:{fg};font-size:0.8rem;margin-top:6px">{label} · מניח תיעוד מלווה 40/40</div>
</div>
""", unsafe_allow_html=True)
    with col_doc:
        st.info("📋 **תיעוד מלווה — 40 נק' (ממתין לבדיקה ידנית ע\"י גיא רונן)**\n\nה-AI לא יכול לבדוק את המסמך המלווה. הציון הסופי מתוך 100 יינתן ע\"י המרצה.")

    st.divider()

    # --- Category Breakdown ---
    st.subheader("פירוט קטגוריות")

    CAT_LABELS = {
        "functional_scope": ("היקף פונקציונלי", 20),
        "design_patterns":  ("עיצוב ותבניות עיצוב", 20),
        "coding_standards": ("סטנדרטים ועיצוב קוד", 5),
        "submission_proc":  ("נהלי הגשה", 5),
        "tech_utilization": ("ניצול טכנולוגיית C#", 10),
    }

    categories = result.get("categories", {})
    for key, (label, max_pts) in CAT_LABELS.items():
        cat = categories.get(key, {})
        s = cat.get("score", 0)
        m = cat.get("max", max_pts)
        feedback = cat.get("feedback", "אין מידע")
        pct = min(s / m, 1.0) if m else 0
        header = f"{label}  —  {s}/{m}"
        with st.expander(header):
            st.progress(pct)
            st.write(feedback)

    st.divider()

    # --- Per-File Analysis ---
    st.subheader("ניתוח לפי קבצים")

    file_list = result.get("files", [])
    if not file_list:
        st.info("לא הוחזרו נתוני קבצים מ-Gemini.")
    else:
        for file_data in file_list:
            fname = file_data.get("filename", "Unknown")
            issues = file_data.get("issues", [])
            original = file_data.get("original_snippet", "")
            fix = file_data.get("suggested_fix", "")
            n = len(issues)
            issue_tag = f"  |  {n} בעי{'ה' if n == 1 else 'ות'}" if n else ""

            with st.expander(f"📄 {fname}{issue_tag}"):
                if issues:
                    st.markdown("**בעיות שנמצאו:**")
                    for issue in issues:
                        st.markdown(f"- {issue}")

                if original or fix:
                    st.markdown("---")
                    col_orig, col_fix = st.columns(2)
                    with col_orig:
                        st.markdown("**קוד נוכחי**")
                        st.code(original, language="csharp")
                    with col_fix:
                        st.markdown("**הצעה לתיקון**")
                        st.code(fix, language="csharp")
