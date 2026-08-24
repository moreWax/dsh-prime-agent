# refine/ — the offline half of the loop

Turns exported sessions into better routing instructions, with a human gate.

```
inbox/*.jsonl ──► inbox_to_traces.py ──► traces.jsonl
                                              │
                            optimize.py (DSPy MIPROv2)
                                              ▼
                                   drafts/router-instructions-*.md
                                        (quarantined, unverified)
                                              │  human review: move into bundle,
                                              │  flip status → verified
                                              ▼
                             appears in dsh skill catalog automatically
```

## Setup

```sh
pip install dspy-ai
export LLM_BASE_URL=http://localhost:4001/v1   # any OpenAI-compatible endpoint
export LLM_API_KEY=...
export LLM_MODEL=...                           # cheap/fast model for inner loops
```

## Run

```sh
python3 inbox_to_traces.py ~/.prime/agent/inbox/*.jsonl > traces.jsonl
python3 optimize.py --traces traces.jsonl --bundle ~/my-wiki
```

## Safety model

- Drafts are **quarantined** to `--out` — never written into a live bundle.
- Drafts carry `status: draft`, so `verifiedOnly: true` profiles never see them.
- Promotion to verified is a deliberate human act.
