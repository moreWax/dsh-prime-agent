# dsh-agent-forge

English | [中文](README.zh.md)

Give every autonomous agent its own GitHub identity. `dsh-agent-forge` is a [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) bundle that provisions one private GitHub App per agent under your own org — commits, PRs and comments carry a distinct `agent-<name>[bot]` identity while you keep exactly **one** human account. Fully ToS-compliant by design.

## Install

```sh
dsh plugin --profile <name> add dsh-agent-forge
```

## Tools

| Tool | Purpose |
|---|---|
| `forge_provision_agent` | Start provisioning; returns a URL for a **one-click human approval** on github.com |
| `forge_list_agents` | List identities, bot names, statuses |
| `forge_agent_token` | Mint a ~1h installation token for an active agent |
| `forge_revoke_agent` | Revoke locally and scrub credentials |

## Configuration (`cordis.yml` row config)

| Field | Default | Meaning |
|---|---|---|
| `stateFile` | `$DSH_HOME/agents.json` | Agent registry |
| `workspaceRoot` | `~/agents` | Per-agent workspaces |
| `callbackPort` | `8765` | One-time callback listener |
| `publicUrl` | — | **Required for provisioning.** Base URL github.com redirects to; must be reachable from the internet (Tailscale address or tunnel) |
| `org` | — | Org to install agent apps into |

Example patch:

```yaml
- insert:
    - id: agent-forge
      name: dsh-agent-forge
      config:
        publicUrl: https://my-tailnet-host.ts.net
        org: my-org
```

## Flow

1. Ask your Harness agent: *"provision an agent named atlas"*.
2. It calls `forge_provision_agent` → open the returned URL, approve once.
3. GitHub redirects back to `publicUrl/callback`; credentials are exchanged automatically.
4. Install the app into your org (manual click, or wire a manager app).
5. `forge_agent_token("atlas")` returns tokens your runtime injects as `GITHUB_TOKEN`.

## Why per-agent Apps?

GitHub's ToS allows one free personal account per person, but machine accounts acting clearly as bots under your ownership are legitimate — and GitHub Apps are the supported primitive: scoped permissions, independent revocation, and a visible `[bot]` identity on every event. No CAPTCHA circumvention, no throwaway accounts.

## License

[MIT](LICENSE). Third-party dependency licenses: [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).
