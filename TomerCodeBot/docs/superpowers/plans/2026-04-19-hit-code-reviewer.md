# HIT Code Reviewer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Streamlit web app (`app.py`) that accepts a C# project ZIP, sends all `.cs` files to Gemini 2.5 Flash, and displays structured grading feedback based on Guy Ronen's Design Patterns rubric.

**Architecture:** Single `app.py` with three pure functions (`extract_zip`, `strip_json_fences`, `analyze_with_gemini`) tested in isolation, plus a Streamlit UI layer that wires them together. API key loaded from `.env`.

**Tech Stack:** Python 3.10+, Streamlit, google-generativeai, python-dotenv, pytest

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `requirements.txt` | Modify | Add `streamlit` |
| `app.py` | Create | All app logic + UI |
| `tests/test_extraction.py` | Create | Tests for `extract_zip` |
| `tests/test_parsing.py` | Create | Tests for `strip_json_fences` + JSON structure |
| `tests/test_analysis.py` | Create | Tests for `analyze_with_gemini` (mocked Gemini) |
| `tests/__init__.py` | Create | Empty, makes tests a package |

---

## Task 1: Update requirements.txt

**Files:**
- Modify: `requirements.txt`

- [ ] **Step 1: Add streamlit and pytest to requirements.txt**

Replace the entire file with:
```
python-telegram-bot
google-generativeai
python-dotenv
streamlit
pytest
```

- [ ] **Step 2: Verify install**

```bash
pip install -r requirements.txt
```
Expected: all packages install without error.

- [ ] **Step 3: Commit**

```bash
git add requirements.txt
git commit -m "feat: add streamlit and pytest to requirements"
```

---

## Task 2: ZIP extraction function + tests

**Files:**
- Create: `tests/__init__.py`
- Create: `tests/test_extraction.py`
- Create: `app.py` (partial — extraction function only)

- [ ] **Step 1: Create empty tests package**

Create `tests/__init__.py` with no content (empty file).

- [ ] **Step 2: Write failing tests for extract_zip**

Create `tests/test_extraction.py`:
```python
import io
import zipfile
import pytest
from app import extract_zip


def make_zip(files: dict[str, str]) -> bytes:
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w") as zf:
        for name, content in files.items():
            zf.writestr(name, content)
    return buf.getvalue()


def test_extracts_cs_files():
    zipped = make_zip({"src/Player.cs": "class Player {}", "src/Game.cs": "class Game {}"})
    result = extract_zip(zipped)
    assert "src/Player.cs" in result
    assert "src/Game.cs" in result
    assert result["src/Player.cs"] == "class Player {}"


def test_ignores_non_cs_files():
    zipped = make_zip({"readme.txt": "hello", "src/Player.cs": "class Player {}"})
    result = extract_zip(zipped)
    assert "readme.txt" not in result
    assert "src/Player.cs" in result


def test_skips_bin_folder():
    zipped = make_zip({"bin/Debug/Player.cs": "class Player {}", "src/Player.cs": "class Player {}"})
    result = extract_zip(zipped)
    assert "bin/Debug/Player.cs" not in result
    assert "src/Player.cs" in result


def test_skips_obj_folder():
    zipped = make_zip({"obj/Release/Player.cs": "class X {}", "src/Player.cs": "class Player {}"})
    result = extract_zip(zipped)
    assert "obj/Release/Player.cs" not in result


def test_skips_git_folder():
    zipped = make_zip({".git/config": "data", "src/Player.cs": "class Player {}"})
    result = extract_zip(zipped)
    assert ".git/config" not in result


def test_empty_zip_returns_empty_dict():
    zipped = make_zip({})
    result = extract_zip(zipped)
    assert result == {}


def test_zip_with_only_non_cs_returns_empty():
    zipped = make_zip({"bin/Player.dll": "binary", "readme.md": "docs"})
    result = extract_zip(zipped)
    assert result == {}
```

- [ ] **Step 3: Run tests — verify they fail**

```bash
pytest tests/test_extraction.py -v
```
Expected: `ModuleNotFoundError: No module named 'app'` or `ImportError`.

- [ ] **Step 4: Create app.py with extract_zip only**

Create `app.py`:
```python
import io
import zipfile

SKIP_DIRS = {"bin", "obj", ".git"}


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
```

- [ ] **Step 5: Run tests — verify they pass**

```bash
pytest tests/test_extraction.py -v
```
Expected: 7 tests PASS.

- [ ] **Step 6: Commit**

```bash
git add tests/__init__.py tests/test_extraction.py app.py
git commit -m "feat: add extract_zip with tests"
```

---

## Task 3: JSON fence stripper + tests

**Files:**
- Create: `tests/test_parsing.py`
- Modify: `app.py` (add `strip_json_fences`)

- [ ] **Step 1: Write failing tests for strip_json_fences**

Create `tests/test_parsing.py`:
```python
import json
import pytest
from app import strip_json_fences


def test_strips_json_fences():
    raw = '```json\n{"key": "value"}\n```'
    assert strip_json_fences(raw) == '{"key": "value"}'


def test_strips_plain_fences():
    raw = '```\n{"key": "value"}\n```'
    assert strip_json_fences(raw) == '{"key": "value"}'


def test_no_fences_unchanged():
    raw = '{"key": "value"}'
    assert strip_json_fences(raw) == '{"key": "value"}'


def test_strips_whitespace():
    raw = '  \n{"key": "value"}\n  '
    assert strip_json_fences(raw) == '{"key": "value"}'


def test_stripped_result_is_valid_json():
    raw = '```json\n{"ai_score": 44, "ai_score_max": 60}\n```'
    cleaned = strip_json_fences(raw)
    parsed = json.loads(cleaned)
    assert parsed["ai_score"] == 44
```

- [ ] **Step 2: Run tests — verify they fail**

```bash
pytest tests/test_parsing.py -v
```
Expected: `ImportError: cannot import name 'strip_json_fences' from 'app'`.

- [ ] **Step 3: Add strip_json_fences to app.py**

Append to `app.py` (after the `extract_zip` function):
```python
import re


def strip_json_fences(text: str) -> str:
    text = text.strip()
    text = re.sub(r"^```(?:json)?\s*", "", text)
    text = re.sub(r"\s*```$", "", text)
    return text.strip()
```

- [ ] **Step 4: Run tests — verify they pass**

```bash
pytest tests/test_parsing.py -v
```
Expected: 5 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add tests/test_parsing.py app.py
git commit -m "feat: add strip_json_fences with tests"
```

---

## Task 4: Gemini analysis function + tests

**Files:**
- Create: `tests/test_analysis.py`
- Modify: `app.py` (add `SYSTEM_PROMPT`, `build_prompt`, `analyze_with_gemini`)

- [ ] **Step 1: Write failing tests for analyze_with_gemini**

Create `tests/test_analysis.py`:
```python
import json
import pytest
from unittest.mock import MagicMock, patch
from app import analyze_with_gemini


VALID_RESPONSE = json.dumps({
    "ai_score": 44,
    "ai_score_max": 60,
    "accompanying_doc": {"pending_manual_review": True, "max": 40},
    "categories": {
        "functional_scope":  {"score": 15, "max": 20, "feedback": "Good"},
        "design_patterns":   {"score": 14, "max": 20, "feedback": "Ok"},
        "coding_standards":  {"score": 3,  "max": 5,  "feedback": "Missing docs"},
        "submission_proc":   {"score": 4,  "max": 5,  "feedback": "Fine"},
        "tech_utilization":  {"score": 8,  "max": 10, "feedback": "Good use of LINQ"}
    },
    "files": [
        {
            "filename": "Player.cs",
            "issues": ["Magic number 42"],
            "original_snippet": "int x = 42;",
            "suggested_fix": "const int MAX_HEALTH = 42;"
        }
    ]
})


def make_mock_model(response_text: str):
    mock_response = MagicMock()
    mock_response.text = response_text
    mock_model = MagicMock()
    mock_model.generate_content.return_value = mock_response
    return mock_model


def test_returns_parsed_json_on_success():
    files = {"Player.cs": "class Player {}"}
    with patch("app.genai.GenerativeModel", return_value=make_mock_model(VALID_RESPONSE)):
        result = analyze_with_gemini(files)
    assert result["ai_score"] == 44
    assert result["ai_score_max"] == 60
    assert "categories" in result
    assert "files" in result


def test_handles_json_wrapped_in_fences():
    wrapped = f"```json\n{VALID_RESPONSE}\n```"
    files = {"Player.cs": "class Player {}"}
    with patch("app.genai.GenerativeModel", return_value=make_mock_model(wrapped)):
        result = analyze_with_gemini(files)
    assert result["ai_score"] == 44


def test_returns_error_dict_on_invalid_json():
    files = {"Player.cs": "class Player {}"}
    with patch("app.genai.GenerativeModel", return_value=make_mock_model("not valid json")):
        result = analyze_with_gemini(files)
    assert "error" in result
    assert "raw_response" in result


def test_returns_error_dict_on_api_exception():
    mock_model = MagicMock()
    mock_model.generate_content.side_effect = Exception("API quota exceeded")
    files = {"Player.cs": "class Player {}"}
    with patch("app.genai.GenerativeModel", return_value=mock_model):
        result = analyze_with_gemini(files)
    assert "error" in result
    assert "API quota exceeded" in result["error"]
```

- [ ] **Step 2: Run tests — verify they fail**

```bash
pytest tests/test_analysis.py -v
```
Expected: `ImportError: cannot import name 'analyze_with_gemini' from 'app'`.

- [ ] **Step 3: Add Gemini logic to app.py**

Append to `app.py` (after `strip_json_fences`):
```python
import json
import os
import google.generativeai as genai
from dotenv import load_dotenv

load_dotenv()
genai.configure(api_key=os.getenv("GEMINI_API_KEY"))

SYSTEM_PROMPT = """You are a strict code reviewer for the HIT "Design Patterns" course (lecturer: Guy Ronen) in Israel.
Analyze the C# project files provided and return ONLY a valid JSON object — no markdown, no backticks, no explanation.

Grade the project on these 5 criteria (60 points total):

1. functional_scope (20 pts): Does the code implement the required functionality? Are all required classes/methods present and working correctly?
2. design_patterns (20 pts): Are design patterns correctly identified and implemented? Are SOLID principles followed? Is inheritance/interfaces used properly?
3. coding_standards (5 pts): Meaningful variable/method names, no magic numbers (use const/readonly), proper encapsulation (private fields + public properties), no redundant code.
4. submission_proc (5 pts): Correct namespace structure, files named according to class names, solution structure follows course conventions.
5. tech_utilization (10 pts): Effective use of C# features (properties, interfaces, generics, LINQ where appropriate, exception handling).

DO NOT grade the accompanying document — it is reviewed manually.

For each .cs file, identify the top issues and provide a short corrected snippet (max 10 lines each).

Return this EXACT JSON structure and nothing else:
{
  "ai_score": <integer sum of all 5 scores>,
  "ai_score_max": 60,
  "accompanying_doc": {"pending_manual_review": true, "max": 40},
  "categories": {
    "functional_scope":  {"score": <0-20>, "max": 20, "feedback": "<explanation>"},
    "design_patterns":   {"score": <0-20>, "max": 20, "feedback": "<explanation>"},
    "coding_standards":  {"score": <0-5>,  "max": 5,  "feedback": "<explanation>"},
    "submission_proc":   {"score": <0-5>,  "max": 5,  "feedback": "<explanation>"},
    "tech_utilization":  {"score": <0-10>, "max": 10, "feedback": "<explanation>"}
  },
  "files": [
    {
      "filename": "<filename.cs>",
      "issues": ["<issue 1>", "<issue 2>"],
      "original_snippet": "<problematic code block>",
      "suggested_fix": "<corrected code block>"
    }
  ]
}"""


def build_prompt(files: dict[str, str]) -> str:
    parts = [SYSTEM_PROMPT]
    for filename, content in files.items():
        parts.append(f"\n\n=== FILE: {filename} ===\n{content}")
    return "\n".join(parts)


def analyze_with_gemini(files: dict[str, str]) -> dict:
    model = genai.GenerativeModel(
        "gemini-2.5-flash",
        generation_config={"response_mime_type": "application/json"},
    )
    prompt = build_prompt(files)
    try:
        response = model.generate_content(prompt)
        raw = strip_json_fences(response.text)
        return json.loads(raw)
    except json.JSONDecodeError as e:
        return {"error": f"JSON parse error: {e}", "raw_response": response.text}
    except Exception as e:
        return {"error": str(e)}
```

- [ ] **Step 4: Run tests — verify they pass**

```bash
pytest tests/test_analysis.py -v
```
Expected: 4 tests PASS.

- [ ] **Step 5: Run all tests**

```bash
pytest tests/ -v
```
Expected: 16 tests PASS total.

- [ ] **Step 6: Commit**

```bash
git add tests/test_analysis.py app.py
git commit -m "feat: add analyze_with_gemini with Gemini 2.5 Flash and tests"
```

---

## Task 5: Streamlit UI — skeleton and upload flow

**Files:**
- Modify: `app.py` (add full Streamlit UI at the bottom)

- [ ] **Step 1: Append the Streamlit UI to app.py**

Append to the end of `app.py`:
```python
import streamlit as st

st.set_page_config(page_title="בודק קוד HIT | Design Patterns", layout="wide")

with st.sidebar:
    st.title("🎓 בודק קוד — HIT")
    st.markdown("**קורס:** Design Patterns")
    st.markdown("**מרצה:** גיא רונן")
    st.divider()
    st.markdown("""
**הוראות שימוש:**
1. צור ZIP של תיקיית הפרויקט
2. העלה את הקובץ בחלון הראשי
3. לחץ **"נתח פרויקט"**
4. קרא את ההערות ותקן לפני ההגשה

**שים לב:**
הציון מתוך **60 בלבד**.
תיעוד מלווה (40 נק') נבדק ידנית ע"י גיא רונן.
""")

st.title("בודק קוד — Design Patterns")
st.caption("ניתוח אוטומטי בעזרת Google Gemini 2.5 Flash")

uploaded_file = st.file_uploader("העלה קובץ ZIP של הפרויקט", type=["zip"])

analyze_clicked = st.button(
    "נתח פרויקט",
    type="primary",
    disabled=(uploaded_file is None),
)

if analyze_clicked and uploaded_file is not None:
    with st.spinner("מחלץ קבצים ומנתח עם Gemini 2.5 Flash..."):
        files = extract_zip(uploaded_file.read())

        if not files:
            st.warning("לא נמצאו קבצי .cs בקובץ ה-ZIP. ודא שהפרויקט כולל קוד C# ואינו מכיל רק תיקיות bin/obj.")
            st.stop()

        result = analyze_with_gemini(files)

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

    col_score, col_doc = st.columns([1, 2])
    with col_score:
        st.markdown(f"""
<div style="background:{bg};padding:24px;border-radius:12px;text-align:center;">
  <div style="color:{fg};font-size:4rem;font-weight:bold;line-height:1">{score}</div>
  <div style="color:{fg};font-size:1.1rem">/ {score_max} נקודות AI</div>
  <div style="color:{fg};font-size:0.9rem;margin-top:6px">{label}</div>
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
        pct = s / m if m else 0
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
```

- [ ] **Step 2: Run all unit tests to confirm nothing broke**

```bash
pytest tests/ -v
```
Expected: 16 tests PASS.

- [ ] **Step 3: Start Streamlit and verify the page loads**

```bash
streamlit run app.py
```
Expected: browser opens, sidebar shows course info, uploader appears, "נתח פרויקט" button is disabled (greyed out) when no file is uploaded.

- [ ] **Step 4: Commit**

```bash
git add app.py
git commit -m "feat: add Streamlit UI with uploader, score card, category breakdown, per-file analysis"
```

---

## Task 6: End-to-end manual smoke test

**Files:** no code changes — validation only.

- [ ] **Step 1: Create a minimal test ZIP**

Create a small C# project ZIP by zipping a folder with 2–3 `.cs` files (or use any existing HIT assignment). Make sure it includes at least one file with a deliberate issue (e.g., a magic number or missing XML doc).

- [ ] **Step 2: Run the app and upload the ZIP**

```bash
streamlit run app.py
```

Upload the ZIP and click "נתח פרויקט".

Expected:
- Spinner appears during analysis
- Score card shows a number out of 60 with appropriate color
- "תיעוד מלווה" info box appears
- Category expanders show scores and feedback text
- Per-file expanders show issues list + side-by-side code comparison

- [ ] **Step 3: Test error path — upload a ZIP with no .cs files**

Create a ZIP containing only `.txt` files and upload it.

Expected: yellow warning "לא נמצאו קבצי .cs" appears, no crash.

- [ ] **Step 4: Final commit**

```bash
git add .
git commit -m "feat: complete HIT code reviewer app - ready for use"
```

---

## Spec Coverage Check

| Spec requirement | Task |
|---|---|
| ZIP upload + recursive extraction | Task 2 |
| Skip bin/, obj/, .git/ | Task 2 |
| C# (.cs) only | Task 2 |
| Single Gemini call (one-shot JSON) | Task 4 |
| response_mime_type + fence stripping | Task 3 + 4 |
| Accompanying doc = Pending Manual Review | Task 4 (SYSTEM_PROMPT) |
| AI score out of 60 | Task 4 + 5 |
| Score card with color coding | Task 5 |
| Category breakdown (5 categories) | Task 5 |
| Per-file expanders with issues + code diff | Task 5 |
| Sidebar with instructions (Hebrew) | Task 5 |
| Error handling: no .cs files | Task 5 |
| Error handling: bad JSON from Gemini | Task 4 + 5 |
| Error handling: API exception | Task 4 + 5 |
