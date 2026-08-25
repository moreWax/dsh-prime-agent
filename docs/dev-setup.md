# Development setup

Framework packages (`@deepseek-ai/cordis`, `@deepseek-ai/dsh-skill`,
`@deepseek-ai/dsh-invariants`) are **published on npm** and installed as
regular devDependencies — no harness checkout required.

```sh
pnpm install
pnpm test        # 16 tests, synthetic fixtures, no network
pnpm build       # emits lib/ per package (tsdown)
```

## Testing inside a real harness

```sh
dsh plugin --profile default add @morewax/dsh-prime-memory
dsh web --no-open                # plugin loads; check the skill catalog
```

## Version policy

Peer ranges are deliberately loose (`>=0.1.1-rc.2`) because the harness is
pre-release and breaks APIs between bumps. CI pins the versions in
`devDependencies`; when upgrading, re-run the full suite — the contracts it
pins (framing escape, budget codes, storage-first export) are exactly what
tends to shift.
