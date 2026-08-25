# Close the learning loop with DSPy

Export dsh turns to Prime, refine offline with DSPy, publish accepted knowledge
back into the catalog. This is the loop that makes agents better next week.

## The loop

```
1. dsh turns ──export──► ~/.prime/agent/inbox/<sessionId>.jsonl   (automatic)
2. prime: refine.run() drains inbox → harness entries              (on demand)
3. okf-refine-cycle: traces → MIPROv2 → quarantined draft pages    (offline)
4. accepted drafts → verified OKF pages                            (human gate)
5. verified pages appear in dsh's skill catalog                    (automatic)
```

Step 1 is this plugin. Steps 2–4 ship in this repo's [`refine/`](../refine/) pipeline — no Prime-side tooling required.

## Enable export

```yaml
- id: prime-memory
  name: '@morewax/dsh-prime-memory'
  config:
    sessionId: <uuid>
    exportTurns: true
```

Each completed turn appends one validated JSONL record:

```json
{
  "ts": "2026-08-24T12:00:00.000Z",
  "sessionId": "…",
  "turnSeq": 7,
  "userText": "why is my build failing",
  "assistantText": "the tsconfig references…",
  "toolCalls": [{"name": "readFile", "summary": "tsconfig.host.json"}]
}
```

Records go through `ctx.storageDomain` when mounted (backend-agnostic), falling
back to append-only JSONL. A crash mid-write leaves a short line — never corrupt
state.

## Feed the optimizer

Pair user tasks with the skills actually loaded (from the same log):

```python
import dspy_ops

pairs = [(r["userText"], r["loadedSkill"]) for r in read_inbox()]
examples = [dspy.Example(task=t, skill=s).with_inputs("task") for t, s in pairs]
```

Then run MIPROv2 over the OKF bundle's optimizable fields and stage accepted
candidates as quarantined drafts (`okf-refine-cycle`). Nothing reaches the
catalog until it passes acceptance.

## Interop

The JSONL records are plain objects — `dsh-memory-porter`-style importers and
any log-analysis tooling can consume them without our plugin installed.
