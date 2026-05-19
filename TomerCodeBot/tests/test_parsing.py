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
