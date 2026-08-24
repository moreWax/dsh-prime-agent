# Ready-made patch layers

Drop-in compositions for `dsh --profile <p> --patch <file>`:

- `prime-harness.patch.yml` — Prime memory injection, skill serving, turn export
- `okf-openwiki.patch.yml` — OKF/OpenWiki knowledge serving with provenance

Both read their configuration from environment variables (see each file's header).
The packages themselves also carry identical manifests under their `dsh.bundle`
key, so npm-installed copies work via `dsh plugin add` without these files.
