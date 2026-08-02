#!/usr/bin/env python3
"""Validate knowledge_cards.json schema and optional non-regression vs previous."""
from __future__ import annotations

import json
import os
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PATH = ROOT / "knowledge_cards.json"
ALLOWED = {"history", "food", "geo"}
NEED = {
    "id",
    "title",
    "content",
    "category",
    "sourceName",
    "sourceURL",
    "funFactValue",
}


def load(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))


def validate_schema(data: dict) -> None:
    if set(data) != {"version", "updatedAt", "cards"}:
        raise SystemExit(f"root keys must be version/updatedAt/cards, got {set(data)}")
    if not isinstance(data["version"], (int, float)) or isinstance(data["version"], bool):
        raise SystemExit("version must be a number")
    if not isinstance(data["updatedAt"], str) or not data["updatedAt"]:
        raise SystemExit("updatedAt must be non-empty string")
    if not isinstance(data["cards"], list):
        raise SystemExit("cards must be a list")
    ids: list[str] = []
    for c in data["cards"]:
        if set(c.keys()) != NEED:
            raise SystemExit(f"bad keys for {c.get('id')}: {set(c.keys())}")
        if c["category"] not in ALLOWED:
            raise SystemExit(f"bad category for {c['id']}")
        if c["sourceURL"] is not None and not isinstance(c["sourceURL"], str):
            raise SystemExit(f"bad sourceURL type for {c['id']}")
        if c["sourceURL"] == "":
            raise SystemExit(f"empty sourceURL for {c['id']} (use null)")
        ids.append(c["id"])
    if len(ids) != len(set(ids)):
        raise SystemExit("duplicate id")


def git_show(ref_path: str) -> dict | None:
    try:
        text = subprocess.check_output(
            ["git", "show", ref_path],
            cwd=ROOT,
            text=True,
            stderr=subprocess.DEVNULL,
        )
        return json.loads(text)
    except (subprocess.CalledProcessError, json.JSONDecodeError):
        return None


def previous_catalog() -> dict | None:
    """On push, HEAD is new commit → use HEAD~1. Otherwise working tree may differ from HEAD."""
    event = os.environ.get("GITHUB_EVENT_NAME", "")
    if event == "push":
        return git_show("HEAD~1:knowledge_cards.json")
    return git_show("HEAD:knowledge_cards.json")


def validate_regression(new: dict, old: dict | None) -> None:
    if old is None:
        print("no previous catalog for regression check; schema OK")
        return
    old_n = len(old.get("cards") or [])
    new_n = len(new["cards"])
    old_v = old.get("version")
    new_v = new["version"]
    if new_n < old_n:
        raise SystemExit(f"card count regression: {old_n} -> {new_n}")
    if isinstance(old_v, (int, float)) and new_v < old_v:
        raise SystemExit(f"version regression: {old_v} -> {new_v}")
    print(f"regression OK vs previous version={old_v} cards={old_n}")


def main() -> None:
    data = load(PATH)
    validate_schema(data)
    validate_regression(data, previous_catalog())
    print("OK", data["version"], len(data["cards"]))


if __name__ == "__main__":
    main()
