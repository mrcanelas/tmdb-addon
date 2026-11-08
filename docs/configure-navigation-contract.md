# MetaLayer Configure Navigation Contract

## Status

`Accepted`

## Related documents

- `AGENTS.md`
- `FRONTEND.md`
- `docs/product-contract-evolution.md`
- `docs/field-resolution-chains.md`
- `docs/appearance.md`
- `docs/language-region.md`
- `docs/sources.md`
- `docs/profiles.md`
- `docs/dashboard.md`
- `docs/deployment.md`
- `docs/security.md`

---

# 1. Purpose

This document defines the simplified information architecture for the MetaLayer Configure application.

The goal is to reduce the number of top-level navigation items without removing functionality.

The navigation should follow the way users think about configuring a Stremio metadata addon:

```text
Home
Sources
Catalogs
Metas
Profiles
Review
Save & Install
```

Former top-level modules such as Tracking, Rules, Sorting, Appearance, Search & AI, Corrections, Inspector, Diagnostics, Advanced, and Language & Region remain available as tabs or contextual tools inside the new areas.

---

# 2. Navigation principles

The Configure navigation must:

- use short, recognizable names;
- avoid exposing internal architecture terms;
- group related tasks into one destination;
- keep advanced functionality accessible without overwhelming simple users;
- preserve deep links to important submodules;
- make Save & Install permanently easy to find;
- distinguish configuration work from review and publication;
- avoid creating a separate AI destination;
- use the same route structure across desktop and mobile;
- remain compatible with profiles and scoped overrides.

---

# 3. Primary navigation

## 3.1 Simple mode

```text
Home
Sources
Catalogs
Metas
Save & Install
```

## 3.2 Advanced mode

```text
Home
Sources
Catalogs
Metas
Profiles
Review
Save & Install
```

`Save & Install` should remain visually separated at the bottom of the sidebar.

Example:

```text
MetaLayer

Home
Sources
Catalogs
Metas
Profiles
Review

────────────────

Save & Install
3 unsaved changes
```

---

# 4. Route contract

## 4.1 Primary routes

```text
/configure
/configure/home
/configure/sources
/configure/catalogs
/configure/metas
/configure/profiles
/configure/review
/configure/save-install
```

`/configure` and `/configure/home` may resolve to the same page.

## 4.2 Tab routes

Current implementation uses path segments (bookmarked deep links and nested React routes):

```text
/configure/sources
/configure/sources/tracking
/configure/sources/search

/configure/catalogs/studio
/configure/catalogs/rules
/configure/catalogs/order

/configure/metas/fields
/configure/metas/language
/configure/metas/appearance

/configure/review/inspector
/configure/review/corrections
/configure/review/diagnostics
```

Query-parameter tabs (`?tab=…`) remain an accepted alternative shape for future UX work; do not ship both as competing public contracts without redirects.

## 4.3 Deep links

```text
/configure/metas/fields?field=title
/configure/metas/fields?field=logo
/configure/metas/fields?field=episodeOrder

/configure/metas/fields?scope=profile&scopeId=anime
/configure/catalogs/studio?catalogId=seasonal-anime
/configure/review/inspector?identity=tt0944947
```

Legacy flat paths (`/catalog-studio`, `/language-region`, `/inspector`, …) redirect to these hubs (`apps/frontend/src/navigation.ts`).

---

# 5. Home

Home is the configuration overview.

It should summarize:

- configuration name;
- selected profile;
- save state;
- published revision;
- connected sources;
- enabled catalogs;
- metadata resolution health;
- unresolved warnings;
- last backup;
- installation status;
- recommended next actions.

Example:

```text
Configuration health

Sources           8 available
Catalogs          12 enabled
Metas             24 fields configured
Warnings          3
Published         Revision 19
Draft             Revision 22
Last backup       2 days ago
```

Home should not become a second administration dashboard.

---

# 6. Sources

Sources contains every external service used by the configuration.

```text
Sources

[Metadata] [Artwork] [Ratings] [Tracking] [Search & AI]
```

Only instance-available or conditionally available providers should appear as selectable.

Existing unavailable providers referenced by saved configurations remain visible with a warning.

## 6.1 Metadata

Examples:

```text
TMDB
TVDB
IMDb
AniList
Kitsu
MyAnimeList
```

Provider cards may show:

- status;
- supported media types;
- metadata capabilities;
- locale support;
- instance credential status;
- per-config credential support;
- connection test;
- health diagnostics.

## 6.2 Artwork

Examples:

```text
TMDB
Fanart.tv
RPDB
TVDB
AniList
```

Capabilities may include:

- poster;
- background;
- logo;
- episode thumbnail;
- language-specific artwork;
- no-language artwork;
- text-free artwork.

## 6.3 Ratings

Examples:

```text
IMDb
TMDB
Trakt
Rotten Tomatoes
Metacritic
```

Rating source configuration may include:

- enabled sources;
- scale normalization;
- vote thresholds;
- weighting;
- fallback behavior.

Field-level rating resolution remains under `Metas → Fields`.

## 6.4 Tracking

Examples:

```text
Trakt
SIMKL
AniList
MyAnimeList
Kitsu
```

Tracking contains:

- OAuth connection;
- connection status;
- reconnect;
- disconnect;
- watched-state sync;
- watchlist sync;
- history sync;
- hide-watched integration;
- degraded-mode status.

OAuth application credentials belong to Admin Providers. User access and refresh tokens belong to the current configuration.

## 6.5 Search & AI

AI is not a general product module.

It exists only as part of search behavior.

```text
Sources → Search & AI
```

Search providers may include:

```text
TMDB Search
IMDb Search
AniList Search
Kitsu Search
```

AI providers may include:

```text
Gemini
Groq
OpenAI
Ollama
```

Supported options:

- semantic search;
- query translation;
- spelling correction;
- original-title detection;
- ambiguous result ranking;
- alternative-title expansion;
- AI fallback provider;
- model selection;
- timeout and retry policy.

AI must not silently change configuration or metadata.

Search suggestions that alter configuration require confirmation and a visible diff.

---

# 7. Catalogs

Catalogs groups catalog definition, rules, and ordering.

```text
Catalogs

[Studio] [Rules] [Order]
```

## 7.1 Studio

Catalog Studio manages catalog definitions.

Functions:

- add catalog;
- import catalog;
- duplicate;
- merge;
- rotate;
- group;
- rename;
- tag;
- enable or disable;
- show on Home;
- hide;
- preview;
- export catalog definition.

Catalog Studio is not an editorial title library.

## 7.2 Rules

Rules controls inclusion and exclusion behavior.

Examples:

- genres;
- release year;
- rating;
- vote count;
- language;
- country;
- certification;
- runtime;
- watched state;
- provider;
- media type;
- anime format;
- availability region.

Rules should support:

- visual builder;
- nested groups;
- AND / OR;
- explanation preview;
- estimated impact;
- validation warnings;
- reusable presets.

## 7.3 Order

Order replaces Sorting as the user-facing label.

It includes:

- catalog order;
- item sorting;
- provider priority;
- randomization;
- rotation;
- pagination;
- trending and popularity weighting;
- custom sort rules.

---

# 8. Metas

`Metas` is the user-facing name for metadata composition and presentation.

```text
Metas

[Fields] [Language & Region] [Appearance]
```

The internal architecture may continue using:

```text
FieldResolutionPlan
ResolutionChainBuilder
MetadataPolicyCompiler
MetadataResolver
```

The user should not need to understand the term Field Resolution Chains.

## 8.1 Fields

Fields is the main editor for metadata composition.

It replaces the user-facing name Field Resolution Chains.

### Field groups

```text
Localized text
Artwork
Facts
Credits
Ratings
Identity
Links and trailers
Episode structure
```

### Example fields

```text
Title
Original title
Overview
Tagline
Poster
Background
Logo
Genres
Runtime
Release date
Rating
Certification
Cast
Directors
Writers
External IDs
Trailers
Episodes
Episode order
Season order
```

### Field editor

For each field, the user may configure:

- resolution mode;
- provider order;
- locale order;
- region;
- fallback behavior;
- confidence threshold;
- effective order;
- capability warnings;
- test with title;
- inheritance state;
- profile, catalog, or title override.

### Layout

```text
┌──────────────────┬──────────────────────────────────────┐
│ Field groups     │ Selected field                       │
│                  │                                      │
│ Localized text   │ Strategy                             │
│   Title          │ Providers                            │
│   Overview       │ Languages                            │
│                  │ Resolution mode                      │
│ Artwork          │ Effective order                      │
│   Poster         │ Warnings                             │
│   Background     │ Test                                 │
│   Logo           │                                      │
│                  │ Previous                    Next     │
└──────────────────┴──────────────────────────────────────┘
```

## 8.2 Language & Region

Language & Region defines global defaults.

Examples:

- interface language;
- primary metadata locale;
- fallback locales;
- original-language behavior;
- content region;
- availability region;
- certification region;
- date format;
- number format;
- duration format.

Field-level overrides remain under `Metas → Fields`.

## 8.3 Appearance

Appearance controls presentation, not provider selection.

Examples:

- add year to title;
- show original title;
- title casing;
- rating style;
- certification style;
- runtime format;
- poster behavior;
- background behavior;
- logo placement;
- text formatting;
- Stremio-like preview.

Responsibility split:

```text
Fields
How data is obtained

Language & Region
Which language and region defaults apply

Appearance
How the resolved result is displayed
```

---

# 9. Profiles

Profiles remains a top-level area in Advanced mode.

Examples:

```text
Default
Anime
Family
Kids
Original Language
```

Profiles may override:

- Sources;
- Catalogs;
- Metas;
- Tracking;
- Appearance;
- installation manifest.

When editing a profile:

```text
Editing Profile: Anime
```

Profile overrides should reuse the same editors with explicit scope context.

Example:

```text
/configure/metas?tab=fields&scope=profile&scopeId=anime
```

Inheritance states:

```text
Inherit
Override
Disable
```

---

# 10. Review

Review groups inspection, corrections, and diagnostics.

```text
Review

[Inspector] [Corrections] [Diagnostics]
```

## 10.1 Inspector

Inspector explains how a final meta was generated.

Example:

```text
Title
TMDB · pt-BR

Overview
TVDB · en-US
Fallback used

Logo
Fanart.tv · no-language
```

Inspector should expose:

- compiled policy;
- attempts;
- contributors;
- fallbacks;
- corrections;
- presentation transformations;
- cache state;
- draft or published revision.

## 10.2 Corrections

Corrections handles:

- canonical identity;
- title;
- external IDs;
- season mapping;
- episode mapping;
- specials;
- split cours;
- absolute order;
- provider mismatches;
- local overrides;
- verified community corrections.

## 10.3 Diagnostics

Diagnostics should show:

- unavailable providers;
- degraded providers;
- invalid configuration;
- excessive fallback;
- unresolved fields;
- cache state;
- capability mismatches;
- OAuth errors;
- stale connections;
- migration warnings;
- publication blockers.

The former Advanced page should be dissolved into contextual destinations:

```text
Identity preferences → Metas or Sources
Cache diagnostics → Review
Feature flags → Admin
Manifest URL → Save & Install
```

---

# 11. Save & Install

The user-facing name remains:

```text
Save & Install
```

It should remain fixed at the bottom of the navigation.

```text
Save & Install

[Save] [Validation] [Revisions] [Backup & Restore] [Install]
```

## 11.1 Save

Save manages the current editable state.

Example:

```text
Unsaved changes
Last saved 2 minutes ago

[Discard]
[Save draft]
[Preview]
[Publish changes]
```

The page may support:

- local unsaved state;
- save draft;
- auto-save;
- manual publish;
- discard draft;
- compare with published;
- publication notes.

Saving and publishing are separate operations when Draft/Publish is enabled.

## 11.2 Validation

Validation summarizes:

```text
0 blocking errors
3 warnings
24 resolved fields
2 fields using fallback
1 unavailable optional provider
```

Validation levels:

- authoring validation;
- compilation validation;
- publication validation;
- installation validation.

Blocking errors must be clearly separated from warnings.

## 11.3 Revisions

Revisions displays configuration history.

Example:

```text
Revision 22 — Draft
Revision 19 — Published
Revision 18 — Previous
```

Actions:

- preview;
- compare;
- restore as draft;
- publish revision;
- add note;
- download revision backup.

Restoring a revision should create a new draft. It must not silently delete newer history.

---

# 12. Backup & Restore

Backup & Restore uses a portable JSON format.

```text
Save & Install → Backup & Restore
```

The feature must support two export modes:

```text
Configuration only
Configuration + API keys and secrets
```

Secrets must be excluded by default.

## 12.1 Configuration-only backup

Default and recommended mode.

Includes:

- configuration;
- profiles;
- catalogs;
- rules;
- ordering;
- Metas field policies;
- language and region;
- appearance;
- corrections;
- tracking preferences without tokens;
- revision metadata where selected;
- source references;
- compatibility requirements;
- schema versions.

Excludes:

- API keys;
- OAuth access tokens;
- OAuth refresh tokens;
- instance secrets;
- dashboard token;
- encryption keys;
- database credentials;
- Redis credentials.

Example:

```json
{
  "format": "metalayer-backup",
  "formatVersion": 1,
  "createdAt": "2026-07-14T12:00:00.000Z",
  "includesSecrets": false,
  "config": {},
  "requirements": {},
  "metadata": {}
}
```

## 12.2 Backup including API keys

This is an explicit advanced option.

The UI must show a strong warning:

```text
This backup may contain API keys and OAuth tokens.
Anyone with access to the file may access connected services.
```

The user must explicitly confirm inclusion.

Recommended controls:

```text
Include secrets
[ ] Provider API keys
[ ] OAuth access tokens
[ ] OAuth refresh tokens
[ ] Search/AI provider keys
```

Instance-level secrets must not be included in a per-configuration backup.

Secrets that may be included:

- user TMDB API key;
- per-config provider API keys;
- user OAuth access token;
- user OAuth refresh token;
- per-config Search/AI keys.

Secrets that must never be included:

- `METALAYER_ENCRYPTION_KEY`;
- previous encryption keys;
- `METALAYER_DASHBOARD_TOKEN`;
- Postgres URL;
- Redis URL;
- OAuth application client secrets managed by Admin;
- instance Fanart key;
- host credentials.

## 12.3 Secret backup protection

Plaintext secret export may be supported only behind an explicit warning, but encrypted export is preferred.

Recommended modes:

```text
Exclude secrets
Include secrets — encrypted
Include secrets — plaintext JSON
```

Default:

```text
Exclude secrets
```

Encrypted backup should use a user-provided passphrase.

Suggested envelope:

```ts
export interface EncryptedBackupEnvelope {
  format: 'metalayer-backup-encrypted'
  formatVersion: 1

  algorithm: 'aes-256-gcm'
  keyDerivation: 'scrypt'

  salt: string
  iv: string
  authTag: string
  ciphertext: string
}
```

The encryption passphrase must:

- never be stored;
- never be logged;
- never be sent to telemetry;
- be required again during restore.

Plaintext secret backup should require a second confirmation.

## 12.4 Backup schema

```ts
export interface MetaLayerBackup {
  format: 'metalayer-backup'
  formatVersion: number

  createdAt: string
  appVersion: string

  source: {
    deploymentMode?: 'lite' | 'server'
    configId?: string
    profileIds?: string[]
  }

  includes: {
    config: boolean
    profiles: boolean
    corrections: boolean
    revisions: boolean
    secrets: boolean
  }

  config: PortableMetaLayerConfig

  revisions?: PortableConfigurationRevision[]
  corrections?: PortableCorrection[]

  requirements: {
    providers: string[]
    capabilities: string[]
    features: string[]
    minimumMetaLayerVersion?: string
  }

  secrets?: PortableSecretEntry[]
  checksum: string
}
```

## 12.5 Portable secrets

```ts
export interface PortableSecretEntry {
  scope: 'configuration'
  provider: string

  kind:
    | 'api-key'
    | 'oauth-access'
    | 'oauth-refresh'
    | 'search-ai-key'

  value: string
}
```

The backup must not contain internal vault ciphertext copied directly from the database because that ciphertext depends on the source installation encryption key.

For portability, secrets must either:

- be excluded;
- be decrypted and re-encrypted with the backup passphrase;
- be exported as explicitly confirmed plaintext.

## 12.6 Backup scopes

The user may choose:

```text
Current configuration
Current profile
All profiles in this configuration
Configuration with revision history
```

For Lite deployments, Admin may separately support an instance backup. That is not the same as the Configure backup.

## 12.7 Restore flow

Recommended flow:

```text
Select JSON file
↓
Validate format and checksum
↓
Enter passphrase if encrypted
↓
Show compatibility report
↓
Choose restore mode
↓
Review secrets
↓
Restore as draft
↓
Validate
↓
Publish manually
```

Restore must default to:

```text
Restore as draft
```

It must not immediately change public Stremio output.

## 12.8 Restore modes

```text
Create new configuration
Replace current draft
Merge into current configuration
Restore selected profiles only
Restore selected catalogs only
Restore revision as new draft
```

Replace operations require confirmation.

## 12.9 Compatibility report

Before restoring:

```text
Compatibility check

✓ TMDB metadata available
✕ Fanart logo unavailable
✓ Trakt tracking available
⚠ Anime absolute ordering unsupported
⚠ Backup created by a newer schema version
```

Possible actions:

```text
Restore with fallbacks
Map unavailable providers
Skip unsupported fields
Cancel
```

## 12.10 Secret restore

When secrets are present:

```text
Secrets found

TMDB API key
Trakt OAuth access token
Trakt OAuth refresh token
Gemini API key
```

The user can select which secrets to restore.

Rules:

1. Secrets are never restored without explicit confirmation.
2. Instance secrets cannot be restored through Configure.
3. OAuth tokens may already be expired.
4. Restored OAuth tokens should be validated.
5. Invalid tokens should be saved only when explicitly requested.
6. Reconnection may be required after restore.
7. Secrets are written into the destination vault, not into configuration JSON.

## 12.11 Backup security UX

The UI should clearly distinguish:

```text
Safe backup
Configuration only
Recommended for sharing and normal backups
```

```text
Sensitive backup
Includes API keys or tokens
Do not share
```

Suggested labels:

```text
Export configuration
Export encrypted full backup
Export plaintext full backup
```

The plaintext option should be under Advanced options.

## 12.12 Suggested APIs

```text
POST /api/v1/configurations/:configId/backup
POST /api/v1/configurations/:configId/backup/encrypted

POST /api/v1/configurations/restore/inspect
POST /api/v1/configurations/restore
POST /api/v1/configurations/:configId/restore

GET  /api/v1/configurations/:configId/revisions/:revisionId/backup
```

Possible request:

```json
{
  "includeProfiles": true,
  "includeCorrections": true,
  "includeRevisions": false,
  "includeSecrets": false
}
```

Secrets should only be returned after valid edit authorization.

## 12.13 Backup acceptance criteria

- [ ] JSON backup is versioned.
- [ ] Configuration-only backup is the default.
- [ ] Secrets are excluded by default.
- [ ] Users may explicitly include per-config API keys.
- [ ] Users may explicitly include OAuth tokens.
- [ ] Instance secrets are never included.
- [ ] Encrypted secret backup is supported or formally planned.
- [ ] Plaintext secret export requires a strong warning and confirmation.
- [ ] Backup contains a checksum.
- [ ] Restore validates format and checksum.
- [ ] Restore shows a compatibility report.
- [ ] Restore defaults to creating a draft.
- [ ] Users can select which secrets to restore.
- [ ] Restored secrets are written to the vault.
- [ ] Public output is unchanged until publish.
- [ ] Newer unsupported backup versions are rejected safely.
- [ ] Partial restore is supported or formally planned.

---

# 13. Install

Install contains:

- manifest URL;
- profile manifest URL;
- copy URL;
- open in Stremio;
- QR code where appropriate;
- installation status;
- published revision;
- validation status;
- public endpoint check.

Example:

```text
Published revision 19
Manifest is valid

https://example.com/c/config-id/manifest.json

[Copy URL]
[Install in Stremio]
```

Installation should use the published revision, not an unpublished draft.

---

# 14. Removed top-level categories

The following remain available but are no longer top-level sidebar items:

```text
Language & Region
Rules
Sorting
Appearance
Tracking
Search & AI
Corrections
Inspector
Diagnostics
Advanced
```

Mapping:

```text
Language & Region → Metas
Rules → Catalogs
Sorting → Catalogs / Order
Appearance → Metas
Tracking → Sources
Search & AI → Sources
Corrections → Review
Inspector → Review
Diagnostics → Review
Advanced → contextual settings or Admin
```

---

# 15. Navigation acceptance criteria

- [ ] Simple mode has no more than five top-level items.
- [ ] Advanced mode has no more than seven top-level items.
- [ ] Save & Install remains fixed and easy to find.
- [ ] Search & AI exists only inside Sources.
- [ ] Tracking exists inside Sources.
- [ ] Rules and Order exist inside Catalogs.
- [ ] Fields, Language & Region, and Appearance exist inside Metas.
- [ ] Inspector, Corrections, and Diagnostics exist inside Review.
- [ ] Profiles appears only in Advanced mode by default.
- [ ] Deep links preserve tab and field context.
- [ ] Existing routes redirect safely during migration.
- [ ] Mobile navigation preserves the same information architecture.
- [ ] Backup & Restore is part of Save & Install.
- [ ] Backup supports JSON with secrets excluded by default.
- [ ] Optional secret backup is explicit and protected.

---

# 16. Final navigation contract

```text
Home

Sources
├── Metadata
├── Artwork
├── Ratings
├── Tracking
└── Search & AI

Catalogs
├── Studio
├── Rules
└── Order

Metas
├── Fields
├── Language & Region
└── Appearance

Profiles

Review
├── Inspector
├── Corrections
└── Diagnostics

Save & Install
├── Save
├── Validation
├── Revisions
├── Backup & Restore
└── Install
```

The resulting navigation is smaller without reducing product capability.

The user sees seven clear areas, while technical complexity remains organized behind tabs, scoped editors, and reusable components.
