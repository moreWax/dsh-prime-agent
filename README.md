# dsh-prime-agent

**Make your DeepSeek Harness agents learn.** A closed learning loop connecting
[Prime Agent](https://github.com/prime-agent)'s continual memory system and an
[OKF/OpenWiki](https://okf.dev) knowledge registry to [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness)
— implemented entirely as native plugins on documented seams. No forks, no patches to core.

```
┌─────────────── dsh session ───────────────┐      ┌────────── Prime Agent ──────────┐
│ skill catalog ◄── okf-knowledge ───────────┼──────│  skills + OKF bundle pages      │
│ durable context ◄── prime-memory ────────┼──────│  memories / prompt notes        │
│ turn transcript ── prime-memory ─────────┼──────► inbox (refine.run)             │
└───────────────────────────────────────────┘      │        ▲                        │
                                                   │        │ DSPy / MIPROv2         │
                                                   └────────┴── OKF draft pages ─────┘
                                                        (accepted candidates flow back
                                                         through the catalog above)
```

## Packages

| Package | What it does | Works standalone |
|---|---|---|
| [`@morewax/dsh-prime-memory`](packages/dsh-prime-memory/) | Serves Prime skills into `ctx.skills`, injects Prime memories as durable context (session-reference contract: escaped, budgeted, fail-loud), exports turns to Prime's inbox for refine | ✅ |
| [`@morewax/dsh-okf-knowledge`](packages/dsh-okf-knowledge/) | Serves OKF/OpenWiki bundle pages as skills **with provenance** — trust tiers (`verified`/`unverified`) surface in metadata, with a `verifiedOnly` trust gate | ✅ |
| [`prime-agent-testkit`](packages/test-support/prime-agent-testkit/) | Reusable fixtures + suites verifying every contract above (16 tests) | dev only |

**New here?** Start with the [5-minute quick start](QUICKSTART.md), then browse the [cookbook](cookbook/).

## Install

```sh
dsh plugin --profile default add @morewax/dsh-prime-memory
dsh plugin --profile default add @morewax/dsh-okf-knowledge
# or straight from GitHub:
dsh plugin --profile default add github:moreWax/dsh-prime-agent
```

## Quick start

```yaml
# ~/.dsh/profiles/default/cordis.patch.yml
- id: prime-memory
  name: '@morewax/dsh-prime-memory'
  config:
    primeHome: ~/.prime/agent       # any Prime Agent install
    sessionId: <prime-session-uuid> # whose memories to surface
    exportTurns: true               # write turns back for refine

- id: okf-knowledge
  name: '@morewax/dsh-okf-knowledge'
  config:
    bundles: [/srv/wiki/core]       # one or more OKF bundles
    verifiedOnly: false
```

The offline optimizer ships too — see [`refine/`](refine/).

See the [cookbook](cookbook/) for complete recipes:
1. [Serve your knowledge base as agent skills](cookbook/01-knowledge-as-skills.md)
2. [Inject durable memories safely](cookbook/02-memory-injection.md)
3. [Close the learning loop with DSPy](cookbook/03-learning-loop.md)
4. [Trust-gated serving for team wikis](cookbook/04-trust-gates.md)

## Why this is different

Memory-injection and transcript-export plugins already exist. This project is not
either of those in isolation — it is the **loop between them**, plus:

- **Provenance-first knowledge**: pages carry machine-readable trust tiers; the
  model catalog distinguishes verified from unverified content.
- **Injection safety by contract**: untrusted memory text cannot forge framing
  tags (lossless escaping), budgets fail with explicit codes.
- **Crash-safe export**: append-only records via `ctx.storageDomain`, never
  corrupt state, never break the agent loop.
- **Real interop**: drives an actual Prime Agent install — not a reimplementation.

## Compatibility

Built against DeepSeek Harness `0.1.1-rc.x` (developer preview). The harness makes
no stability promises pre-release; we re-verify against every upstream bump and pin
tested versions here.

## Development

```sh
pnpm install
pnpm test          # 16 tests: store readers, provider wiring, export, injection safety
pnpm build
```

Framework packages come from npm — no harness checkout needed. See
[docs/dev-setup.md](docs/dev-setup.md) for testing inside a live harness.

## License

[MIT](LICENSE)
