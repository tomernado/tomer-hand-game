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


def make_mock_groq(response_text: str):
    mock_message = MagicMock()
    mock_message.content = response_text
    mock_choice = MagicMock()
    mock_choice.message = mock_message
    mock_completion = MagicMock()
    mock_completion.choices = [mock_choice]
    mock_client = MagicMock()
    mock_client.chat.completions.create.return_value = mock_completion
    return mock_client


def test_returns_parsed_json_on_success():
    files = {"Player.cs": "class Player {}"}
    with patch("app._groq_client", make_mock_groq(VALID_RESPONSE)):
        result = analyze_with_gemini(files)
    assert result["ai_score"] == 44
    assert result["ai_score_max"] == 60
    assert "categories" in result
    assert "files" in result


def test_handles_json_wrapped_in_fences():
    wrapped = f"```json\n{VALID_RESPONSE}\n```"
    files = {"Player.cs": "class Player {}"}
    with patch("app._groq_client", make_mock_groq(wrapped)):
        result = analyze_with_gemini(files)
    assert result["ai_score"] == 44


def test_returns_error_dict_on_invalid_json():
    files = {"Player.cs": "class Player {}"}
    with patch("app._groq_client", make_mock_groq("not valid json")):
        result = analyze_with_gemini(files)
    assert "error" in result
    assert "raw_response" in result


def test_returns_error_dict_on_api_exception():
    mock_client = MagicMock()
    mock_client.chat.completions.create.side_effect = Exception("API quota exceeded")
    files = {"Player.cs": "class Player {}"}
    with patch("app._groq_client", mock_client):
        result = analyze_with_gemini(files)
    assert "error" in result
    assert "API quota exceeded" in result["error"]
