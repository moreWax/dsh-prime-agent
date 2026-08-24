# Development setup

These packages compile against DeepSeek Harness's published types. Until the
harness ships stable type packages, build against a checkout.

## Option A — sibling checkout (recommended)

```sh
git clone https://github.com/deepseek-ai/deepseek-harness.git
git clone https://github.com/<you>/dsh-prime-bridge.git
cd dsh-prime-bridge
pnpm install
pnpm test
```

Point the dev overrides at your harness checkout in `package.json`:

```json
{
  "pnpm": {
    "overrides": {
      "@deepseek-ai/cordis": "link:../deepseek-harness/vendor/cordis",
      "@deepseek-ai/dsh-skill": "link:../deepseek-harness/packages/skill/skill",
      "@deepseek-ai/dsh-invariants": "link:../deepseek-harness/packages/runtime-diagnostics/invariants"
    }
  }
}
```

## Option B — npm types

Once DeepSeek publishes type packages, drop the overrides and depend on ranges.

## Testing without a Prime install

All suites run against synthetic fixtures (`makePrimeHome()`, `makeOkfBundle()`)
— no Prime Agent or network required.
