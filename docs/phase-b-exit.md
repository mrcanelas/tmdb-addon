# Phase B exit checklist (Security and persistence)

Status: **partial** — core vault/persistence/import/revisions/export/logs are in place.
Key rotation automation remains deferred (designed in ADR 0005).

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
| Key rotation tooling | Deferred | Envelope has `keyVersion`; operator tooling TBD |

## Exit criteria (AGENTS.md §37 Phase B)

> new configurations contain no secrets in URLs

Satisfied for native MetaLayer configurations created through `/api/v1/configurations` and legacy import into vaulted storage.

## Remaining before calling Phase B complete

1. Operator tooling for encryption-key rotation / progressive re-encryption.
2. Optional: encrypted backup export that *includes* secrets (explicit opt-in; not the default safe export).
3. Broader log audit across future worker/dashboard processes when they land.
