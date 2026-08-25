# Serve your knowledge base as agent skills

Turn any OKF/OpenWiki bundle into live, model-invocable skills — the agent
discovers and loads your documentation exactly like its built-in capabilities.

## The bundle

An OKF bundle is a directory of markdown pages with frontmatter:

```markdown
---
kind: skill
status: verified
description: Route file tasks to the fs capability
---
# File routing
When the user asks about file organization, prefer the fs tool family...
```

- `kind` — page category (`skill`, `decision`, `failure-mode`, …). Only pages
  with a `kind` are served.
- `status` — `verified` or anything else. Drives provenance metadata (see
  [recipe 4](04-trust-gates.md)).
- `description` — what the model sees in discovery; falls back to the first heading.

## Mount it

```yaml
- id: okf-knowledge
  name: '@morewax/dsh-okf-knowledge'
  config:
    bundles:
      - /srv/wiki/core        # multiple bundles merge; first wins name conflicts
      - /srv/wiki/team
```

Or as an env-driven patch:

```yaml
bundles: !!js (process.env.DSH_OKF_BUNDLES || '').split(':').filter(Boolean)
```

## Verify

```sh
dsh --profile default web
# open http://127.0.0.1:3080 → start a session → open the / skill menu
# every kind-declaring page in your bundle appears with its description
```

Programmatically:

```ts
const entry = await ctx.skills.get('file-routing')
console.log(entry?.metadata?.okfStatus)   // 'verified'
console.log(entry?.content)               // markdown body, frontmatter stripped
```

## What NOT to do

Do not point `bundles` at directories containing untrusted third-party markdown
without reading [recipe 4](04-trust-gates.md) — knowledge pages are data, and
this plugin marks them untrusted but cannot stop a model from following
instructions it was told to treat carefully.
