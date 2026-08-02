#!/usr/bin/env python3
"""Merge a delta JSON into a full catalog; rebuild index; optionally archive."""
from __future__ import annotations

import argparse
import json
import re
import sys
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
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
BAD = re.compile(r"<\s*script|javascript:|onerror\s*=|onload\s*=", re.I)


def title_key(text: str) -> str:
    return "".join(
        ch.lower()
        for ch in text
        if ch.isalnum() or "\u4e00" <= ch <= "\u9fff"
    )


def load(path: Path):
    return json.loads(path.read_text(encoding="utf-8"))


def dump(path: Path, data) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(
        json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )


def validate_card(c: dict, where: str) -> None:
    if set(c.keys()) != NEED:
        raise SystemExit(f"{where}: bad keys {set(c.keys())}")
    if c["category"] not in ALLOWED:
        raise SystemExit(f"{where}: bad category")
    if c["sourceURL"] == "":
        raise SystemExit(f"{where}: empty sourceURL (use null)")
    if c["sourceURL"] is not None and not isinstance(c["sourceURL"], str):
        raise SystemExit(f"{where}: bad sourceURL type")
    if isinstance(c["sourceURL"], str) and not c["sourceURL"].startswith("https://"):
        raise SystemExit(f"{where}: sourceURL must be https or null")
    for field in ("title", "content", "funFactValue", "sourceName", "id"):
        if not isinstance(c[field], str) or not c[field].strip():
            raise SystemExit(f"{where}: empty {field}")
        if BAD.search(c[field]):
            raise SystemExit(f"{where}: suspicious content in {field}")


def build_index(catalog: dict) -> dict:
    return {
        "version": catalog["version"],
        "updatedAt": catalog["updatedAt"],
        "cardCount": len(catalog["cards"]),
        "cards": [
            {
                "id": c["id"],
                "title": c["title"],
                "category": c["category"],
                "sourceName": c["sourceName"],
                "titleKey": title_key(c["title"]),
            }
            for c in catalog["cards"]
        ],
    }


def merge(base: dict, delta: dict) -> dict:
    if (
        "baseVersion" not in delta
        and set(delta.keys()) == {"version", "updatedAt", "cards"}
        and len(delta.get("cards") or []) > 40
    ):
        raise SystemExit(
            "refusing: input looks like a full catalog; use delta with baseVersion + cards"
        )
    if "baseVersion" not in delta or "cards" not in delta:
        raise SystemExit("delta must include baseVersion and cards")
    if delta["baseVersion"] != base["version"]:
        raise SystemExit(
            f"baseVersion mismatch: delta={delta['baseVersion']} live={base['version']}"
        )

    ids = {c["id"] for c in base["cards"]}
    titles = {title_key(c["title"]) for c in base["cards"]}
    new_cards = []
    for i, c in enumerate(delta["cards"]):
        validate_card(c, f"delta[{i}]")
        if c["id"] in ids:
            raise SystemExit(f"duplicate id: {c['id']}")
        tk = title_key(c["title"])
        if tk in titles:
            raise SystemExit(f"duplicate title: {c['title']}")
        ids.add(c["id"])
        titles.add(tk)
        new_cards.append(c)

    if not new_cards:
        raise SystemExit("delta has no cards")

    return {
        "version": base["version"] + 1,
        "updatedAt": datetime.now(timezone.utc)
        .replace(microsecond=0)
        .isoformat()
        .replace("+00:00", "Z"),
        "cards": list(base["cards"]) + new_cards,
    }


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--base", type=Path, default=ROOT / "knowledge_cards.json")
    ap.add_argument("--delta", type=Path, required=True)
    ap.add_argument("--out", type=Path, default=ROOT / "knowledge_cards.json")
    ap.add_argument(
        "--index-out", type=Path, default=ROOT / "index" / "catalog_index.json"
    )
    ap.add_argument("--archive", action="store_true")
    args = ap.parse_args()

    merged = merge(load(args.base), load(args.delta))
    dump(args.out, merged)
    if args.out.resolve() == (ROOT / "knowledge_cards.json").resolve():
        dump(ROOT / "public" / "knowledge_cards.json", merged)
    dump(args.index_out, build_index(merged))
    if args.archive:
        dump(ROOT / "versions" / f"v{merged['version']}.json", merged)
        man_path = ROOT / "versions" / "manifest.json"
        manifest = load(man_path) if man_path.exists() else []
        if not isinstance(manifest, list):
            manifest = []
        entry = {
            "version": merged["version"],
            "updatedAt": merged["updatedAt"],
            "cardCount": len(merged["cards"]),
            "path": f"versions/v{merged['version']}.json",
        }
        manifest = [e for e in manifest if e.get("version") != merged["version"]]
        manifest.insert(0, entry)
        dump(man_path, manifest)
    print(
        f"OK +{len(load(args.delta)['cards'])} -> v{merged['version']} ({len(merged['cards'])} cards)"
    )


if __name__ == "__main__":
    main()
