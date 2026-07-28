# Migration from TMDB Addon

Existing TMDB Addon users can import a legacy configuration into MetaLayer without mutating the old URL.

Canonical rules: `AGENTS.md` §6. Dual-identity strategy and migration report fields are defined there — do not invent alternate semantics here.

## Flow

1. Open configure → Overview → **Import TMDB Addon config** (or `POST /api/v1/configurations/import-legacy`).
2. MetaLayer parses and validates the legacy payload (dry-run / preview supported).
3. The import summary lists imported fields, secrets destined for the vault (ids only), and items that need attention.
4. On confirm, MetaLayer creates a native persistent configuration; secrets move into the Secret Vault; the configure session switches to the new `configId`.
5. The user is taken to Save & Install for `/c/:configId/manifest.json`. The legacy configuration remains untouched.

## Typical import mapping

| Legacy | MetaLayer |
|---|---|
| `language` / provider / art provider | Localization + Field Resolution plans |
| Catalog order / disabled catalogs | Catalog Studio instances |
| Trakt / MDBList / RPDB / AI settings | Sources + Tracking + Search & AI modules |
| API keys in URL | Secret Vault references |

Needs-attention examples: deprecated options, changed filter semantics, disconnected OAuth, unsupported combinations.

## Fixtures and tests

Legacy fixtures live under `tests/fixtures/legacy/`. Coverage is exercised by `apps/server/src/legacy-import.test.ts` (matrix across §33.5-style fixtures; malformed → `LEGACY_IMPORT_FAILED`; persist vaults secrets).

## Compatibility window

Legacy compressed Stremio URLs remain supported on the MetaLayer server (`/:catalogChoices/...` with identity `tmdb-addon`) for the documented migration window (`AGENTS.md` §6.5). Native MetaLayer mode uses server-side configuration IDs and does not put secrets in URLs. The historical Express addon process is archived on branch `legacy/tmdb-addon-3.1.7`. Removal of legacy-identity URL support requires a stable release, proven migration tooling, a support window, and a major-version announcement (`docs/deprecations.md`).
