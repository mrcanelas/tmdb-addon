# Migration from TMDB Addon

Existing TMDB Addon users can import a legacy configuration into MetaLayer without mutating the old URL.

## Flow

1. Open configure → import (or `POST /api/v1/configurations/import-legacy`).
2. MetaLayer parses and validates the legacy payload (dry-run supported).
3. The import summary lists imported fields and items that need attention.
4. On confirm, MetaLayer creates a native persistent configuration; secrets move into the Secret Vault.
5. The user receives a new `/c/:configId/manifest.json` URL. The legacy configuration remains untouched.

## Fixtures and tests

Legacy fixtures live under `tests/fixtures/legacy/`. Coverage is exercised by `apps/server/src/legacy-import.test.ts` (matrix across §33.5-style fixtures; malformed → `LEGACY_IMPORT_FAILED`).

## Compatibility window

Legacy routes remain supported for the documented migration window (`AGENTS.md` §6). Native MetaLayer mode uses server-side configuration IDs and does not put secrets in URLs.

Canonical rules: `AGENTS.md` §6. Dual-identity strategy and migration report fields are defined there — do not invent alternate semantics here.
