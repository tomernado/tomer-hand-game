# HIT Design Patterns Code Reviewer — Design Spec
Date: 2026-04-19

## Overview

A Streamlit web application (`app.py`) that allows students in the HIT "Design Patterns" course (lecturer: Guy Ronen) to upload their C# project as a ZIP file and receive structured AI-generated feedback based on the course grading rubric. The AI feedback is approximate and meant to guide students before submission — Guy Ronen provides the official grade.

## Tech Stack

- **Frontend:** Streamlit
- **AI Engine:** Google Gemini 2.5 Flash (`gemini-2.5-flash`) via `google-generativeai` SDK
- **Config:** API key loaded from `.env` via `python-dotenv` (local use only)
- **Language analyzed:** C# (`.cs` files only)

## Architecture

Single file: `app.py`. Three logical layers:

### 1. ZIP Extraction — `extract_zip(zip_bytes) → dict[str, str]`
- Accepts raw bytes of an uploaded ZIP
- Recursively finds all `.cs` files
- Skips paths containing `bin/`, `obj/`, `.git/`
- Returns `{filename: file_content}` dict

### 2. Gemini Analysis — `analyze_with_gemini(files_dict) → dict`
- Builds a single prompt consolidating all files with clear separators
- Instructs Gemini to return **only** valid JSON (no markdown wrapping)
- Parses and returns the JSON response
- On parse failure: returns error dict with raw response for debugging

### 3. Streamlit UI
- Sidebar: course name, instructions, credits
- Main area: uploader → analyze button → results dashboard

## Scoring Model

The AI grades **only** the 60 points it can assess from code alone. The "Accompanying Document" category (40 pts) requires a human reviewer and is marked `"pending_manual_review": true` in the JSON — it is excluded from the AI score calculation.

**AI-scored total: X / 60**

| Category | Max |
|---|---|
| Functional Scope | 20 |
| Design Patterns | 20 |
| Coding Standards | 5 |
| Submission Procedures | 5 |
| Tech Utilization | 10 |
| **Total (AI)** | **60** |

Score card colors apply to the /60 score: red (<36), yellow (36–47), green (≥48).

## JSON Parsing Safety

Use `generation_config={"response_mime_type": "application/json"}` in the `GenerativeModel` call. As a fallback, strip leading/trailing markdown fences (` ```json ... ``` `) before calling `json.loads`.

## Gemini JSON Schema

```json
{
  "ai_score": 44,
  "ai_score_max": 60,
  "accompanying_doc": {"pending_manual_review": true, "max": 40},
  "categories": {
    "functional_scope":  {"score": 15, "max": 20, "feedback": "..."},
    "design_patterns":   {"score": 14, "max": 20, "feedback": "..."},
    "coding_standards":  {"score": 3,  "max": 5,  "feedback": "..."},
    "submission_proc":   {"score": 4,  "max": 5,  "feedback": "..."},
    "tech_utilization":  {"score": 8,  "max": 10, "feedback": "..."}
  },
  "files": [
    {
      "filename": "Player.cs",
      "issues": ["Magic number 42 in line 17", "Missing XML doc on GetHealth()"],
      "original_snippet": "// short problematic code block",
      "suggested_fix": "// corrected version"
    }
  ]
}
```

## UI Layout

**Sidebar:**
- Title: "בודק קוד — קורס Design Patterns | HIT"
- Instructor: Guy Ronen
- Usage instructions (Hebrew)

**Main Area (sequential):**
1. Page title + subtitle
2. `st.file_uploader` for `.zip` files
3. "נתח פרויקט" button — disabled until file uploaded
4. On analysis: `st.spinner` while waiting for Gemini
5. Results:
   - **Score card**: large colored metric (X / 60) — red (<36), yellow (36–47), green (≥48); "Accompanying Document: Pending Manual Review" shown separately
   - **Category table**: `st.dataframe` or manual rows — 6 categories, score/max + feedback
   - **Per-file expanders**: one `st.expander` per `.cs` file with:
     - Bulleted issues list
     - Two-column layout: `st.code(original_snippet)` | `st.code(suggested_fix)`

## Error Handling

- ZIP contains no `.cs` files → show warning, stop
- Gemini returns non-JSON → show raw response in expander with error message
- `google.generativeai` exception → show error message with exception text

## Out of Scope

- Authentication / multi-user support
- Storing results between sessions
- Java support
- Deployment (local only)
