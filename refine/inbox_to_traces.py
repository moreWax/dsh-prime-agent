#!/usr/bin/env python3
"""Convert prime-memory turn-export JSONL into DSPy routing examples.

Reads one or more inbox files produced by @morewax/dsh-prime-memory and emits
JSONL of {"task": ..., "skill": ...} pairs suitable for dspy.Example construction.

Usage:
  python3 inbox_to_traces.py ~/.prime/agent/inbox/*.jsonl > traces.jsonl

Skill attribution: records carry the assistant text; we pair each user task with
skills explicitly named in the turn's tool calls or assistant text (heuristic v1).
"""
import json
import re
import sys
from pathlib import Path


def iter_records(paths):
    for p in paths:
        for line in Path(p).read_text(encoding="utf-8").splitlines():
            line = line.strip()
            if not line:
                continue
            try:
                rec = json.loads(line)
            except json.JSONDecodeError:
                continue  # torn final line from a crash-mid-write is expected; skip
            if isinstance(rec, dict) and rec.get("userText"):
                yield rec


def extract_skill_names(text: str) -> list[str]:
    # heuristic v1: CamelCase-ish identifiers and known skill-name shapes
    return sorted(set(re.findall(r"\b([a-z][a-zA-Z]*-?[A-Z][a-zA-Z]+|[a-z]+_[a-z]+)\b", text or "")))


def main() -> None:
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(1)
    out = 0
    for rec in iter_records(sys.argv[1:]):
        task = " ".join(str(rec["userText"]).split())
        if len(task) < 8:
            continue  # skip vacuous continuations ("go on", "ok")
        skills = {
            s
            for tc in rec.get("toolCalls") or []
            for s in extract_skill_names(str(tc.get("name", "")))
        } | set(extract_skill_names(str(rec.get("assistantText", ""))))
        if not skills:
            continue
        example = {"task": task[:2000], "skill": sorted(skills)[0], "candidates": sorted(skills)}
        print(json.dumps(example))
        out += 1
    print(f"# {out} routing pairs written to stdout", file=sys.stderr)


if __name__ == "__main__":
    main()
