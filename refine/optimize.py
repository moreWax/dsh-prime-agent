#!/usr/bin/env python3
"""Optimize OKF/OpenWiki skill routing with DSPy (MIPROv2).

Reads traces.jsonl (from inbox_to_traces.py) plus your OKF bundle(s), builds a
skill-routing program, optimizes it offline against a local/OpenAI-compatible
endpoint, and writes optimized instruction candidates as quarantined draft
pages back into the bundle.

Env:
  LLM_BASE_URL   e.g. http://localhost:4001/v1 (any OpenAI-compatible endpoint)
  LLM_API_KEY    bearer token
  LLM_MODEL      model name for optimizer inner loops (cheap + fast recommended)

Usage:
  python3 optimize.py --traces traces.jsonl --bundle ~/my-wiki [--out drafts/]
"""
import argparse
import json
import os
import sys
from datetime import datetime, timezone
from pathlib import Path


def load_bundle_skills(bundles: list[str]) -> dict[str, dict]:
    skills = {}
    for root in bundles:
        for p in Path(root).rglob("*.md"):
            raw = p.read_text(encoding="utf-8", errors="replace")
            meta = {}
            if raw.startswith("---\n"):
                head, _, rest = raw.partition("\n---\n")
                for line in head.replace("---\n", "", 1).splitlines():
                    k, _, v = line.partition(":")
                    if k and v:
                        meta[k.strip()] = v.strip()
                body = rest
            else:
                body = raw
            name = p.stem
            if "kind" in meta and name not in skills:
                skills[name] = {
                    "name": name,
                    "path": str(p),
                    "description": meta.get("description", ""),
                    "status": meta.get("status", "unverified"),
                    "body": body,
                }
    return skills


def build_examples(traces_path: str, skills: dict[str, dict]):
    import dspy

    valid = set(skills)
    examples = []
    with open(traces_path, encoding="utf-8") as f:
        for line in f:
            if line.startswith("#"):
                continue
            try:
                r = json.loads(line)
            except json.JSONDecodeError:
                continue
            if r.get("skill") in valid:
                examples.append(dspy.Example(task=r["task"], skill=r["skill"]).with_inputs("task"))
    return examples


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--traces", required=True)
    ap.add_argument("--bundle", action="append", required=True, dest="bundles")
    ap.add_argument("--out", default="drafts")
    args = ap.parse_args()

    try:
        import dspy
    except ImportError:
        sys.exit("pip install dspy-ai first")

    skills = load_bundle_skills(args.bundles)
    if not skills:
        sys.exit("no kind-declaring pages found in bundles")
    trainset = build_examples(args.traces, skills)
    print(f"{len(skills)} skills, {len(trainset)} training pairs")

    lm = dspy.LM(
        f"openai/{os.environ.get('LLM_MODEL', 'gpt-4o-mini')}",
        api_base=os.environ.get("LLM_BASE_URL", "https://api.openai.com/v1"),
        api_key=os.environ.get("LLM_API_KEY", os.environ.get("OPENAI_API_KEY", "")),
    )
    dspy.configure(lm=lm)

    choices = ", ".join(sorted(skills))
    router = dspy.ChainOfThought(dspy.Signature(
        f"task -> skill: string  # best skill name from: {choices}"))

    class SkillRouter(dspy.Module):
        def forward(self, task):
            return router(task=task)

    out_dir = Path(args.out)
    out_dir.mkdir(exist_ok=True)
    stamp = datetime.now(timezone.utc).strftime("%Y%m%d-%H%M%S")

    train = trainset[: max(6, len(trainset) // 2)]
    dev = [e for e in trainset if e not in train][:20] or trainset[:5]

    def metric(example, pred, trace=None):
        return int((pred.skill or "").strip() == example.skill)

    optimized = dspy.MIPROv2(metric=metric, auto="light")(SkillRouter(), trainset=train, valset=dev)

    # quarantine: never write into the bundle directly — drafts go to --out
    draft = out_dir / f"router-instructions-{stamp}.md"
    draft.write_text(
        "---\n"
        "kind: skill\n"
        f'status: draft\n'
        f"description: DSPy-optimized routing instructions (quarantined {stamp})\n"
        "---\n\n"
        "# Router instructions (DRAFT - requires human review)\n\n"
        f"{optimized.router.predict.signature.instructions}\n",
        encoding="utf-8",
    )
    print(f"draft written: {draft}  (human review -> move into bundle as verified)")


if __name__ == "__main__":
    main()
