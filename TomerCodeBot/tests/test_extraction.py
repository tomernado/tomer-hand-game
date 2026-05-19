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
