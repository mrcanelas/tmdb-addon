# Phase B exit checklist (Security and persistence)

Status: **complete** — vault/persistence/import/revisions/export/logs and encryption-key rotation tooling are in place.

## Checklist

| Item | Status | Notes |
|---|---|---|
| Persistent configuration (`/c/:configId`) | Done | SQLite Lite via `node:sqlite` |
| Edit credentials (hash only) | Done | scrypt |
| Secret Vault (AES-256-GCM) | Done | ADR 0005 |
| No secrets in native manifest URL | Done | |
| Safe logs (redaction) | Done | `@metalayer/security` + Fastify logger |
| Safe exports | Done | `GET .../export`, `includesSecrets: false` |
| Legacy TMDB Addon import | Done | `planLegacyImport` + `import-legacy` |
| Revision history / restore | Done | create/update snapshots + restore |
| Key rotation tooling | Done | Key ring + `pnpm metalayer:vault-reencrypt` |

## Exit criteria (AGENTS.md §37 Phase B)

> new configurations contain no secrets in URLs

Satisfied for native MetaLayer configurations created through `/api/v1/configurations` and legacy import into vaulted storage.

## Remaining optional follow-ups

1. Optional: encrypted backup export that *includes* secrets (explicit opt-in; not the default safe export).
2. Broader log audit across future worker/dashboard processes when they land.
3. Dashboard operator view of pending vault reencrypt counts (CLI covers Lite/Server today).
