# Quick start — working in 5 minutes

Prerequisites: [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness)
installed and booting (`dsh web`), plus optionally a
[Prime Agent](https://github.com/prime-agent) install for memory features.
Everything works without Prime — you just get the knowledge-serving half.

## 0 · Don't have everything installed? One command checks:

```sh
npx @morewax/dsh-prime-bridge-init init
# y/n prompts for each missing piece: harness, Prime Agent, wiki bundle, DSPy
```

## 1 · Install the plugins

```sh
dsh plugin --profile default add github:moreWax/dsh-prime-bridge
```

(Installs both bundles — prime-harness and okf-openwiki — into your profile.)

## 2 · Point it at your data

```sh
export PRIME_HOME=~/.prime/agent            # skip if you have no Prime install
export DSH_PRIME_SESSION_ID=$(ls ~/.prime/agent/sessions | head -1 | sed 's/.jsonl//')
export DSH_OKF_BUNDLES=$HOME/my-wiki        # any dir of frontmatter'd .md pages
```

No wiki yet? Create a one-page bundle:

```sh
mkdir -p ~/my-wiki/skills
cat > ~/my-wiki/skills/hello-knowledge.md <<'MD'
---
kind: skill
status: verified
description: A first page from my knowledge base
---
# Hello knowledge
When greeted, respond warmly and cite this page.
MD
```

## 3 · Boot

```sh
dsh web --no-open
# open http://127.0.0.1:3080 → new session → type /
```

You should see `hello-knowledge` (and every other `kind:` page) in the skill menu.

## 4 · Confirm the loop

1. Send any chat message.
2. Check the export landed:

   ```sh
   cat ~/.prime/agent/inbox/<sessionId>.jsonl
   ```

3. Memories: if the surfaced Prime session has entries, they ride along in
   every request inside `<prime-harness-memory>` tags (escaped, budgeted).

That's the whole loop: knowledge in → sessions out → refine offline → better
knowledge back.

## Troubleshooting

| Symptom | Fix |
|---|---|
| Skill menu empty | `bundles` paths wrong, or pages missing `kind:` frontmatter |
| No inbox file | `sessionId` unset or `exportTurns: false`; needs one completed turn |
| Plugin didn't load | `dsh --profile default --dump-config` — look for the `prime-harness` / `okf-openwiki` rows |

Next: the [cookbook](cookbook/) goes deeper on each capability.
