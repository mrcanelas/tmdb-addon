# ADR 0005: Secret Vault encryption (AES-256-GCM)

- Status: Accepted
- Date: 2026-07-11
- Deciders: MetaLayer maintainers

## Context

Phase B requires persistent configurations without secrets in Stremio URLs (`AGENTS.md` §22–§23).
Secrets (API keys, OAuth tokens) must be encrypted at rest with authenticated encryption.
Approved algorithms include AES-256-GCM and XChaCha20-Poly1305.

## Decision

1. Secret Vault uses **AES-256-GCM** via Node.js `crypto` (no custom cryptography).
2. Master key comes from `METALAYER_ENCRYPTION_KEY` (32-byte key, base64 or hex encoded). The key is never stored in the database.
3. Ciphertext envelope format:

```text
v1:<keyVersion>:<ivBase64Url>:<tagBase64Url>:<ciphertextBase64Url>
```

4. Each secret value is encrypted with a random 12-byte IV.
5. `keyVersion` starts at `1` to allow future rotation / progressive re-encryption.
6. Edit credentials are stored as **scrypt** password hashes only (never reversible encryption).
7. Configuration JSON stores secret **references** (vault entry IDs), never plaintext secrets.
8. Default Lite persistence is **SQLite** via Node.js built-in `node:sqlite` (`METALAYER_SQLITE_PATH`), avoiding native addon compilation on developer machines. Postgres remains a Server-mode follow-up.
9. Operators rotate keys with a multi-version **key ring**:
   - `METALAYER_ENCRYPTION_KEY` — active key
   - `METALAYER_ENCRYPTION_KEY_VERSION` — active version (default `1`)
   - `METALAYER_ENCRYPTION_PREVIOUS_KEYS` — `version:key,...` for decrypt-only during migration
   - `pnpm metalayer:vault-reencrypt` — progressive re-encryption (supports `--dry-run`)

## Consequences

- New native configs can omit secrets from manifest URLs.
- Key loss makes vault contents unrecoverable — operators must back up `METALAYER_ENCRYPTION_KEY`.
- Runtime can decrypt older envelopes while previous keys remain in the ring; after reencrypt, previous keys may be removed.

## Alternatives considered

- **XChaCha20-Poly1305:** equally acceptable; deferred to keep stdlib-only crypto for Lite.
- **Encrypt whole config blob:** rejected; field-level vault entries allow selective invalidation and redacted exports.
- **libsodium only:** optional later; Node `crypto` is sufficient for AES-GCM.
