# Trust-gated serving for team wikis

The whole point of provenance metadata: different audiences get different
knowledge surfaces from the same bundle.

## Mark trust at authoring time

Frontmatter is the single source of truth:

```markdown
---
kind: decision
status: verified          # ← human-reviewed
description: Database migration policy
---
Decisions below were reviewed by @dba-team on 2026-08-01...
```

Anything else (`status: draft`, missing status) is **unverified**: still
servable by default, but visibly marked.

## Gate by audience

Personal profile — see everything, unverified marked:

```yaml
- id: okf-knowledge
  name: '@morewax/dsh-okf-knowledge'
  config:
    bundles: [/srv/wiki/team]
```

Production/CI agent — verified only:

```yaml
- id: okf-knowledge
  name: '@morewax/dsh-okf-knowledge'
  config:
    bundles: [/srv/wiki/team]
    verifiedOnly: true       # unverified pages vanish from the catalog entirely
```

## Check provenance programmatically

```ts
const skill = await ctx.skills.get('db-migration-policy')
const trust = skill?.metadata?.okfStatus        // 'verified' | 'unverified'
if (trust !== 'verified') requireHumanReview()
```

## Combining with memory injection

Trust tiers and injected memories compose but stay independent systems:
memories are always framed as untrusted data regardless of their origin, while
OKF pages carry authored, human-controlled trust labels. If a workflow needs a
memory promoted to trusted knowledge, promote it into the OKF bundle through
the review process — never by editing the injection path.

## Known limitations

- No signature/attestation of bundle contents yet (planned: OKF attested
  computations).
- Trust is per-page; there is no per-section granularity.
