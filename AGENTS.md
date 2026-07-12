# AGENTS.md

# MetaLayer Master Plan

This document is the authoritative implementation guide for **MetaLayer**.

It defines:

- the product mission;
- the functional scope;
- the target architecture;
- the migration strategy from TMDB Addon;
- the competitive parity requirements;
- the security and quality standards;
- the release and semantic-versioning policy;
- the rules that coding agents and contributors must follow.

Every agent or contributor working in this repository must read this document before making changes.

---

# 1. Product identity

## 1.1 Name

The product name is:

```text
MetaLayer
```

Recommended tagline:

```text
Your metadata. Your catalogs. Your way.
```

Alternative technical positioning:

```text
The complete metadata orchestration layer for Stremio.
```

## 1.2 Product statement

> MetaLayer combines, resolves, filters, enriches, explains, and corrects metadata from multiple sources before delivering it to Stremio.

MetaLayer is not merely a TMDB wrapper.

MetaLayer is not merely a metadata provider selector.

MetaLayer is not merely a catalog generator.

MetaLayer is a complete metadata orchestration platform.

## 1.3 Origin

MetaLayer is the successor to **TMDB Addon for Stremio**.

The old project remains historically important and must be supported through a deliberate migration path.

The MetaLayer brand, version line, configuration model, and architecture are new.

## 1.4 First stable version

The first stable MetaLayer release must be:

```text
1.0.0
```

MetaLayer must not inherit the TMDB Addon version number.

Do not publish MetaLayer as `3.x`, `4.x`, or another continuation of the legacy project.

Development previews may use Semantic Versioning prerelease identifiers:

```text
1.0.0-alpha.1
1.0.0-alpha.2
1.0.0-beta.1
1.0.0-rc.1
1.0.0
```

The stable public launch is `1.0.0`.

---

# 2. Mission

MetaLayer must become the most complete, reliable, configurable, secure, and understandable metadata addon for Stremio.

The project should aim to:

- reach and exceed the functional coverage of advanced metadata addons;
- improve every inherited TMDB Addon capability;
- provide first-class movie, series, and anime support;
- support multiple metadata, artwork, catalog, rating, tracking, and identity providers;
- provide first-class internationalization for the interface, metadata, catalogs, errors, dates, numbers, and regions;
- provide powerful catalog creation and manipulation;
- provide structured filtering and sorting;
- explain why each value and title was selected;
- correct provider inconsistencies;
- protect user credentials;
- remain maintainable despite its large feature set;
- support both simple personal deployments and large public instances.

There is no requirement to rush the stable release.

Correctness, design consistency, maintainability, and migration safety are more important than release speed.

---

# 3. Competitive objective

## 3.1 Benchmark

AIOMetadata is a functional benchmark for MetaLayer.

MetaLayer must ultimately match or improve the following categories:

- multi-source metadata;
- movies, series, and anime;
- provider selection by content type;
- artwork selection;
- catalog creation;
- streaming-provider catalogs;
- catalog ordering and disabling;
- catalog merging;
- user configuration persistence;
- account integrations;
- watch tracking;
- AI catalog generation;
- ID mapping;
- Redis and database caching;
- self-hosting;
- operator dashboard;
- Docker distribution;
- configuration import and export.

## 3.2 MetaLayer superiority requirements

Feature parity alone is insufficient.

MetaLayer must be clearly superior in:

1. **Control**
   - coherent rules;
   - contextual filtering;
   - multi-level inheritance;
   - predictable sorting;
   - field-level provider selection.

2. **Explainability**
   - metadata provenance;
   - rule explanations;
   - fallback explanations;
   - exclusion reasons;
   - identity-mapping confidence.

3. **Corrections**
   - community corrections;
   - season mapping;
   - episode mapping;
   - alternative orders;
   - local overrides;
   - versioned correction history.

4. **Security**
   - encrypted secrets;
   - no secrets in URLs;
   - no secrets in cache keys;
   - redacted logs;
   - safe configuration exports;
   - explicit telemetry controls.

5. **User experience**
   - Simple and Advanced modes;
   - global settings search;
   - live previews;
   - guided onboarding;
   - undo, revision history, and rollback;
   - mobile-first configuration;
   - first-class multilingual and regional behavior;
   - accessible left-to-right and right-to-left layout foundations.

6. **Architecture**
   - provider boundaries;
   - versioned schemas;
   - strict validation;
   - capability declarations;
   - contract tests;
   - incremental migrations.

7. **Reliability**
   - circuit breakers;
   - provider fallbacks;
   - observable degradation;
   - cache correctness;
   - safe retries;
   - deterministic results.

## 3.3 Independent implementation

Feature parity refers to product behavior, not source-code copying.

Agents must not copy code, UI components, documentation, schemas, or text from:

- AIOMetadata;
- AIOStreams;
- other addons;

unless the license is explicitly reviewed and the reuse is approved.

AIOStreams is GPL-licensed. Its source must not be copied into an Apache-licensed MetaLayer codebase.

AIOMetadata is Apache-licensed, but MetaLayer should still prefer independent implementation to preserve design consistency, authorship clarity, and long-term maintainability.

Product concepts and public behavior may be studied and independently implemented.

---

# 4. Product principles

## 4.1 Build the best product, not the longest feature list

Every capability must be:

- coherent;
- documented;
- tested;
- observable;
- secure;
- compatible with the rest of the system.

Do not add integrations solely to increase provider count.

## 4.2 Power without confusion

MetaLayer must support power users without forcing every user to understand advanced metadata concepts.

Use:

- sensible defaults;
- presets;
- progressive disclosure;
- Simple mode;
- Advanced mode;
- explanations;
- previews.

## 4.3 No silent behavior

MetaLayer must not silently ignore unsupported configuration.

When a provider cannot support a requested rule, the system must:

- show the limitation;
- explain the fallback;
- avoid pretending the rule was applied.

## 4.4 No accidental breaking changes

Public Stremio routes, manifest identity, configuration IDs, and stored schemas are compatibility contracts.

Breaking changes require:

- a migration;
- a deprecation period when practical;
- release notes;
- a Semantic Versioning major release.

## 4.5 Secure by default

The default configuration must not expose:

- API keys;
- OAuth tokens;
- edit credentials;
- private account IDs;
- sensitive logs.

## 4.6 Architecture before uncontrolled expansion

Before adding a new provider, the system must have:

- a provider interface;
- capability declarations;
- timeout behavior;
- retry policy;
- cache policy;
- error classification;
- tests.

---

# 5. Semantic Versioning policy

MetaLayer follows Semantic Versioning.

Reference:

```text
MAJOR.MINOR.PATCH
```

## 5.1 Initial development

The project starts at:

```text
1.0.0-alpha.1
```

Recommended progression:

```text
1.0.0-alpha.1
1.0.0-alpha.2
...
1.0.0-beta.1
1.0.0-beta.2
...
1.0.0-rc.1
1.0.0-rc.2
...
1.0.0
```

Do not use `0.x` releases for MetaLayer.

## 5.2 Alpha

Alpha releases are allowed to contain:

- incomplete modules;
- unstable schemas;
- missing migrations;
- incomplete UI;
- experimental provider integrations.

Alpha builds are not guaranteed to preserve compatibility between prereleases.

Every alpha change must still be testable and documented internally.

## 5.3 Beta

Beta begins when:

- the major architecture is stable;
- the configuration schema is versioned;
- all 1.0 feature categories exist;
- legacy migration works;
- no major module is a placeholder.

During beta:

- new major features should be minimized;
- compatibility should normally be preserved;
- focus shifts to correctness, UX, performance, and migration.

## 5.4 Release candidate

Release candidates begin when:

- feature scope is frozen;
- migrations are frozen except for critical fixes;
- documentation is complete;
- security review is complete;
- deployment artifacts are complete;
- no known critical defects remain.

An RC should be potentially releasable as `1.0.0`.

## 5.5 Stable releases

After `1.0.0`:

### Patch release

Use `1.0.x` for:

- bug fixes;
- security fixes that preserve compatibility;
- documentation corrections;
- performance improvements without public behavior changes;
- provider API compatibility fixes.

Examples:

```text
1.0.1
1.0.2
```

### Minor release

Use `1.x.0` for backward-compatible features:

- new providers;
- new catalog sources;
- new optional rules;
- new UI modules;
- new correction types;
- new optional API endpoints.

Examples:

```text
1.1.0
1.2.0
```

### Major release

Use `x.0.0` for incompatible changes:

- removing legacy routes;
- changing the default manifest identity incompatibly;
- removing configuration fields without migration;
- changing public API response contracts;
- requiring user action to keep an existing installation working;
- incompatible database or encryption changes without automatic migration.

Examples:

```text
2.0.0
3.0.0
```

## 5.6 Version independence

The following identifiers must not be derived automatically from the package version or package name:

- manifest ID;
- configuration ID;
- database schema version;
- correction schema version;
- provider adapter version.

Each identifier has its own lifecycle.

---

# 6. Legacy TMDB Addon migration

## 6.1 Migration objective

Existing TMDB Addon users must have a safe path to MetaLayer.

The legacy project and MetaLayer have separate version lines.

Version reset does not justify breaking legacy users.

## 6.2 Dual identity strategy

MetaLayer should support two installation modes during migration.

### Legacy compatibility mode

Legacy URLs continue to:

- resolve old compressed configurations;
- use the legacy manifest identity where required;
- preserve old behavior where safely possible;
- display a migration notice in the configuration UI.

### Native MetaLayer mode

New persistent configurations use:

- a native MetaLayer manifest route;
- a stable MetaLayer manifest identity;
- server-side configuration;
- encrypted secrets;
- the new schema.

The exact native manifest ID must be finalized before beta and recorded in an Architecture Decision Record.

## 6.3 Migration flow

The configuration UI must support:

```text
Import TMDB Addon configuration
```

Expected flow:

1. User pastes or opens a legacy configuration URL.
2. MetaLayer parses the legacy configuration.
3. MetaLayer validates every field.
4. MetaLayer displays an import summary.
5. MetaLayer identifies incompatible or changed behavior.
6. User confirms migration.
7. MetaLayer creates a persistent configuration.
8. Secrets are moved to the Secret Vault.
9. User receives the new manifest URL.
10. Legacy configuration remains untouched.

## 6.4 Migration report

The migration summary should show:

```text
Imported:
- language;
- region;
- catalogs;
- catalog order;
- Trakt settings;
- MDBList catalogs;
- artwork settings;
- AI settings;
- search settings.

Needs attention:
- deprecated option;
- changed filter semantics;
- disconnected OAuth account;
- provider no longer available;
- unsupported legacy combination.
```

## 6.5 Legacy route lifetime

Legacy routes must not be removed before:

- a stable MetaLayer release exists;
- migration tooling is proven;
- a documented support window has elapsed;
- a major version release explicitly announces removal.

---

# 7. Product modules

MetaLayer is divided into the following product modules:

```text
Overview
Sources
Language & Region
Catalog Studio
Rules
Sorting
Appearance
Search & AI
Tracking
Corrections
Profiles
Advanced
Save & Install
Dashboard
```

Each module must have:

- a clear responsibility;
- a stable internal model;
- validation;
- tests;
- documentation;
- diagnostics.

---

# 8. Sources

## 8.1 Purpose

The Sources module manages external services that provide:

- metadata;
- artwork;
- ratings;
- catalogs;
- availability;
- tracking;
- identity mapping;
- AI capabilities.

## 8.2 Provider categories

### Metadata providers

Planned:

- TMDB;
- TVDB;
- IMDb datasets or compatible services;
- TVmaze;
- AniList;
- MyAnimeList through Jikan;
- Kitsu;
- optional future providers.

### Artwork providers

Planned:

- TMDB;
- TVDB;
- Fanart.tv;
- RPDB;
- Top Posters;
- custom URL patterns;
- optional compatible artwork services.

### Ratings providers

Planned:

- IMDb;
- TMDB;
- Trakt;
- MDBList;
- Rotten Tomatoes when legally and technically available;
- Metacritic when legally and technically available.

### Catalog and list providers

Planned:

- TMDB;
- TVDB;
- Trakt;
- MDBList;
- SIMKL;
- AniList;
- MyAnimeList;
- TMDB account lists;
- streaming-provider catalogs;
- imported static lists.

### Tracking providers

Planned:

- Trakt;
- SIMKL;
- AniList;
- MyAnimeList;
- TMDB account;
- optional future providers.

### AI providers

Initial candidates:

- Gemini;
- OpenRouter.

Do not add many AI providers before a provider-neutral structured-output layer exists.

## 8.3 Source card

Each source must display:

- provider name;
- category;
- connection state;
- capabilities;
- credential state;
- last successful request;
- last failure;
- rate-limit state;
- latency;
- dependent features;
- disconnect action;
- test action.

## 8.4 Provider capabilities

Every provider must declare capabilities.

```ts
export interface ProviderCapabilities {
  mediaTypes: Array<'movie' | 'series' | 'anime'>;
  metadataFields: MetadataField[];
  catalogFeatures: CatalogCapability[];
  supportsSearch: boolean;
  supportsPagination: boolean;
  supportsRegion: boolean;
  supportsLanguage: boolean;
  supportsAgeRating: boolean;
  supportsDigitalRelease: boolean;
  supportsTracking: boolean;
  supportsOAuth: boolean;
}
```

The UI must derive available options from capabilities instead of hard-coded provider assumptions.

---

# 9. Internationalization and localization

## 9.1 Purpose

Internationalization is a core MetaLayer subsystem and must not be postponed until the end of development.

MetaLayer must independently model:

- interface language;
- metadata language;
- metadata fallback languages;
- original-title preference;
- content region;
- availability region;
- certification region;
- release-date region;
- timezone;
- date, time, number, and duration formatting.

Language and region are related but are not the same setting.

Example:

```text
Interface locale: pt-BR
Metadata locale: pt-BR
Metadata fallbacks: pt-PT, en-US
Content region: BR
Certification region: BR
Availability region: BR
Original language preference: Japanese
Timezone: America/Fortaleza
```

## 9.2 Standards

Use:

- BCP 47 language tags for locales;
- ISO 3166-1 alpha-2 codes for countries and regions;
- IANA timezone identifiers;
- Unicode locale conventions;
- `Intl` APIs for formatting;
- CLDR-compatible plural and message behavior.

Examples:

```text
pt-BR
pt-PT
en-US
en-GB
es-ES
es-MX
zh-Hans-CN
zh-Hant-TW
ar-SA
```

Do not reduce all locales to two-letter language codes internally.

Provider adapters may convert a full locale into provider-specific parameters.

## 9.3 Localization preferences

```ts
export interface LocalizationPreferences {
  interfaceLocale: string;
  metadataLocale: string;
  metadataFallbackLocales: string[];

  titleMode:
    | 'localized'
    | 'original'
    | 'localized-with-original'
    | 'original-with-localized';

  descriptionMode:
    | 'localized'
    | 'original'
    | 'best-available';

  contentRegion: string;
  availabilityRegion?: string;
  certificationRegion?: string;
  releaseRegion?: string;

  timezone: string;
  dateStyle?: 'short' | 'medium' | 'long';
  timeStyle?: 'short' | 'medium';
  numberNotation?: 'standard' | 'compact';
}
```

## 9.4 Locale negotiation

Resolve the interface locale in this order:

```text
Explicit profile preference
Configuration preference
Authenticated user preference
Browser locale
en-US
```

Resolve metadata languages in this order:

```text
Primary metadata locale
Configured fallback locales
Base language fallback when supported
Original provider language
en-US when appropriate
Best available provider value
```

The exact metadata fallback chain must be visible in Meta Inspector.

Do not silently replace a requested language without recording the fallback.

## 9.5 Initial stable locales

The `1.0.0` interface must ship with complete support for:

```text
en-US
pt-BR
es-ES
```

Recommended ownership:

```text
en-US: canonical source locale
pt-BR: officially maintained
es-ES: officially reviewed or assigned maintainer
other locales: community maintained
```

The architecture must support additional locales during alpha.

Potential later locales include:

```text
pt-PT
fr-FR
de-DE
it-IT
tr-TR
ru-RU
uk-UA
ja-JP
ko-KR
zh-Hans-CN
zh-Hant-TW
ar-SA
```

## 9.6 Translation toolkit

The default implementation should use:

- `i18next` for message catalogs;
- `react-i18next` for React integration;
- an ICU-compatible formatting layer for plurals and interpolation;
- native `Intl` APIs for dates, times, numbers, lists, display names, and relative time.

A different toolkit requires an Architecture Decision Record.

Do not scatter provider-specific translation logic across UI components.

## 9.7 Package structure

Target:

```text
packages/i18n/
  src/
    index.ts
    locale-registry.ts
    locale-negotiation.ts
    metadata-fallback.ts
    provider-locale-adapters.ts
    formatting.ts
    direction.ts
    validation.ts

    locales/
      en-US/
        common.json
        navigation.json
        sources.json
        catalogs.json
        rules.json
        sorting.json
        appearance.json
        corrections.json
        tracking.json
        dashboard.json
        errors.json

      pt-BR/
        common.json
        navigation.json
        sources.json
        catalogs.json
        rules.json
        sorting.json
        appearance.json
        corrections.json
        tracking.json
        dashboard.json
        errors.json

      es-ES/
        common.json
        navigation.json
        sources.json
        catalogs.json
        rules.json
        sorting.json
        appearance.json
        corrections.json
        tracking.json
        dashboard.json
        errors.json
```

Split catalogs by domain. Do not create one unbounded translation file.

## 9.8 Translation keys

Use semantic keys:

```ts
t('catalog.actions.create')
t('rules.rating.minimum.label')
t('errors.sourceCredentialMissing', { source: 'TMDB' })
```

Do not use English sentences as keys:

```ts
t('Create catalog')
```

Do not construct translated sentences by concatenating fragments.

## 9.9 Pluralization and interpolation

Messages must use locale-aware plural forms.

Example concept:

```json
{
  "catalog.results": "{count, plural, one {# result} other {# results}}"
}
```

CI must verify that placeholders are identical across locale variants.

Unsafe:

```ts
`${count} ${t('catalogs')}`
```

Preferred:

```ts
t('catalog.results', { count })
```

## 9.10 Formatting

Use locale-aware formatters for:

- dates;
- times;
- timezones;
- relative time;
- numbers;
- percentages;
- compact vote counts;
- durations;
- language names;
- country names;
- lists.

Use `Intl`, not manual formatting:

```ts
new Intl.DateTimeFormat(locale, options);
new Intl.NumberFormat(locale, options);
new Intl.RelativeTimeFormat(locale, options);
new Intl.ListFormat(locale, options);
new Intl.DisplayNames(locale, options);
```

## 9.11 Structured backend errors

Backend and management APIs must return stable error codes, not user-facing English sentences as the only error representation.

Preferred:

```json
{
  "code": "SOURCE_CREDENTIAL_MISSING",
  "params": {
    "source": "TMDB"
  },
  "correlationId": "..."
}
```

The frontend translates the code:

```ts
t(`errors.${error.code}`, error.params);
```

Server logs may include technical English descriptions, but public clients must receive a stable code.

## 9.12 Provider locale adapters

Each provider must define how it accepts language and region.

```ts
export interface ProviderLocaleAdapter {
  toProviderLocale(input: {
    locale: string;
    region?: string;
  }): {
    language?: string;
    region?: string;
    locale?: string;
  };

  supportsLocale(locale: string): boolean;
  getFallbacks(locale: string): string[];
}
```

Examples:

- one provider may accept `pt-BR`;
- another may accept `pt`;
- another may require separate `language=pt-BR` and `region=BR`;
- another may not support localization at all.

These limitations must be declared through provider capabilities.

## 9.13 Localized metadata resolution

Metadata Resolver must resolve localized fields independently.

Localized fields include:

- title;
- original title;
- aliases;
- description;
- tagline;
- genre labels;
- certification display labels;
- episode titles;
- season titles;
- artwork language.

Example resolution:

```text
Description requested in pt-BR
1. TMDB pt-BR: missing
2. TMDB pt-PT: missing
3. TVDB pt: missing
4. TMDB en-US: selected
5. Original language: not needed
```

Meta Inspector must show:

```text
Description language: en-US
Fallback used: yes
Requested language: pt-BR
```

## 9.14 Original-title behavior

Users must be able to choose:

```text
Localized title
Original title
Localized title with original title
Original title with localized title
```

Anime may additionally expose:

- native title;
- romanized title;
- English title;
- localized title.

Do not force anime title preferences to match movie and series preferences.

## 9.15 Localized catalog names

Catalog definitions must preserve a stable internal identity and allow localized display names.

```ts
export interface LocalizedText {
  default: string;
  values?: Record<string, string>;
}

export interface CatalogDefinition {
  instanceId: string;
  name: LocalizedText;
}
```

Example:

```json
{
  "default": "Trending Movies",
  "values": {
    "pt-BR": "Filmes em alta",
    "es-ES": "Películas en tendencia"
  }
}
```

Custom user names may:

- use one shared name;
- provide locale-specific variants;
- fall back to the default custom name.

Never use a translated display name as the catalog's stable identity.

## 9.16 Brand names

Do not translate registered or provider names unless the provider supplies an official localized brand.

Keep names such as:

```text
TMDB
Trakt
AniList
MDBList
Netflix
```

Translate surrounding UI labels and explanations.

## 9.17 Region separation

The following settings must be independently configurable in Advanced mode:

- interface locale;
- metadata locale;
- content region;
- streaming availability region;
- certification region;
- release-date region.

Simple mode may synchronize them to one country selection.

Changing interface language must not silently change the user's content availability region.

## 9.18 Cache and localization

All response caches must include every locale or region value that affects output.

Examples:

- metadata locale;
- fallback-chain hash;
- title mode;
- content region;
- certification region;
- availability region;
- timezone when output depends on it.

Do not share localized output across incompatible locale configurations.

Provider raw-data caches may remain provider-oriented when the raw response is language-neutral.

## 9.19 Profiles

Profiles may override:

- interface locale;
- metadata locale;
- metadata fallbacks;
- title mode;
- region;
- certification region;
- availability region;
- timezone.

A family may use one configuration with profiles in different languages.

## 9.20 Right-to-left readiness

Even if `1.0.0` does not ship with an RTL locale, UI architecture must be RTL-ready.

Requirements:

- set document `lang`;
- set document `dir`;
- use CSS logical properties;
- avoid hard-coded left/right assumptions;
- mirror directional icons when appropriate;
- test navigation and forms in an RTL pseudo-locale.

Prefer:

```css
margin-inline-start
padding-inline-end
inset-inline-start
```

Avoid unnecessary use of:

```css
margin-left
padding-right
left
right
```

## 9.21 Pseudo-localization

Development must support pseudo-locales for testing:

```text
en-XA: expanded accented text
ar-XB: right-to-left mirrored text
```

Pseudo-localization should help detect:

- clipped labels;
- hard-coded strings;
- layout overflow;
- missing direction support;
- concatenated messages.

## 9.22 Translation workflow

Every pull request that adds user-facing text must:

1. add an `en-US` key;
2. avoid hard-coded UI strings;
3. add or update `pt-BR`;
4. add `es-ES` when the stable translation set is required;
5. preserve interpolation placeholders;
6. run locale validation;
7. document intentionally untranslated technical text.

Machine translation may assist contributors but must be reviewed before being marked complete.

## 9.23 CI validation

CI must detect:

- missing canonical keys;
- missing required stable-locale keys;
- unused keys;
- invalid JSON or message syntax;
- placeholder mismatches;
- invalid plural syntax;
- invalid locale identifiers;
- duplicate keys;
- hard-coded user-facing strings where static analysis is practical;
- untranslated fallback leakage in release builds.

Target command:

```bash
pnpm i18n:check
```

Optional commands:

```bash
pnpm i18n:extract
pnpm i18n:pseudo
pnpm i18n:coverage
```

## 9.24 Translation coverage

The dashboard or build output should report coverage by locale and namespace.

Example:

```text
en-US: 100%
pt-BR: 100%
es-ES: 100%
fr-FR: 72% — community preview
```

Incomplete community locales must be clearly marked.

## 9.25 Documentation localization

Core documentation for `1.0.0` should be available in:

```text
English
Portuguese (Brazil)
```

Spanish documentation is recommended but may follow after interface completion.

Do not block security documentation updates while waiting for translations.

The English security document remains canonical when translations lag.

## 9.26 Internationalization release requirements

Before `1.0.0`:

- no primary interface page contains hard-coded user-facing text;
- `en-US`, `pt-BR`, and `es-ES` interface catalogs are complete;
- locale negotiation is tested;
- metadata fallback is configurable;
- provider locale adapters exist;
- catalog names support localization;
- errors use stable codes;
- dates, numbers, durations, and plurals are localized;
- cache keys account for locale-sensitive output;
- Meta Inspector shows language fallback;
- pseudo-locales pass layout tests;
- RTL foundations are verified.

---

# 10. Metadata Resolver and Field Resolution Chains

## 10.1 Purpose

The Metadata Resolver combines fields from multiple providers.

It must not simply choose one provider for the whole title unless the user requests that behavior.

**Field Resolution Chains** are the configuration model for that behavior: users build the final metadata object field by field, with independent provider and locale priorities per field, media type, profile, and catalog.

This is a core MetaLayer differentiator.

The product must not merely ask “which provider do you want?”.

It must allow the user to define how a specific field is resolved for a media type, language, region, provider set, and fallback chain.

The selected value must always be explainable through Meta Inspector.

## 10.2 Goals

The Field Resolution system must:

- allow provider priority per metadata field;
- allow locale priority per metadata field;
- combine provider and locale priorities deterministically;
- support language-first, provider-first, and explicit ordering;
- support different rules for movies, series, and anime;
- support image assets with language and no-language variants;
- support episode-order providers and order types;
- support profile and catalog overrides;
- respect provider capabilities;
- skip unavailable combinations;
- preserve provenance;
- expose fallback behavior;
- integrate with corrections;
- generate stable cache keys;
- remain backward compatible with simpler provider settings.

## 10.3 Non-goals

This feature does not:

- merge arbitrary text fragments from multiple providers into one description;
- use AI to rewrite metadata automatically;
- guarantee that every provider supports every locale;
- guarantee that two providers model seasons and episodes identically;
- bypass provider terms, API limits, or attribution requirements;
- expose provider credentials to clients;
- replace Identity Graph or Correction Hub.

AI-based metadata composition may be designed separately later.

## 10.4 Configurable fields

Supported configurable fields should include:

```ts
export type MetadataField =
  | 'title'
  | 'originalTitle'
  | 'aliases'
  | 'overview'
  | 'tagline'
  | 'poster'
  | 'background'
  | 'logo'
  | 'rating'
  | 'voteCount'
  | 'certification'
  | 'releaseDate'
  | 'digitalReleaseDate'
  | 'runtime'
  | 'status'
  | 'genres'
  | 'keywords'
  | 'cast'
  | 'directors'
  | 'writers'
  | 'studios'
  | 'networks'
  | 'countries'
  | 'languages'
  | 'trailers'
  | 'episodes'
  | 'episodeOrder'
  | 'seasonOrder'
  | 'externalIds';
```

Field categories for resolution behavior:

- **Localized text** — title, overview, tagline, episode/season titles;
- **Artwork** — poster, background, logo, episode thumbnail;
- **Numeric / factual** — runtime, rating, vote count, release date, status;
- **Credits** — cast, directors, writers, studios, networks;
- **Identity** — external IDs (Identity Graph + corrections);
- **Episode structure** — episodes, episode order, season order.

## 10.5 Core concepts

| Concept | Meaning |
|---|---|
| Field | One final metadata property |
| Resolution plan | Configuration describing how a field is resolved |
| Resolution attempt | One concrete provider + context combination |
| Resolution result | Selected value plus provenance, attempts, warnings, confidence |
| Locale selector | Explicit locale, original language, no language, any language, or provider default |
| Resolution strategy | How provider and locale lists expand into attempts |

Locale preferences use BCP 47. Region preferences use ISO 3166-1 alpha-2.

```ts
export type LocalePreference =
  | { type: 'locale'; value: string }
  | { type: 'original-language' }
  | { type: 'no-language' }
  | { type: 'any-language' }
  | { type: 'provider-default' };

export type RegionPreference =
  | { type: 'region'; value: string }
  | { type: 'configuration-region' }
  | { type: 'profile-region' }
  | { type: 'provider-default' };

export type ResolutionStrategy =
  | 'locale-first'
  | 'provider-first'
  | 'explicit';
```

## 10.6 Resolution strategies

### Locale-first

Try every provider for the first locale before moving to the next locale.

Recommended for title, overview, tagline, and localized episode/season names.

Example effective order with providers TMDB → TVDB → IMDb and locales pt-BR → en-US → original:

```text
TMDB pt-BR → TVDB pt-BR → IMDb pt-BR →
TMDB en-US → TVDB en-US → IMDb en-US →
TMDB original → TVDB original → IMDb original
```

### Provider-first

Try every locale on the first provider before moving to the next provider.

Recommended when provider consistency or editorial quality outweighs language priority.

### Explicit

The user defines every attempt manually.

Recommended for advanced users, artwork, anime, mixed regional metadata, and exact reproducibility.

## 10.7 Configuration model

```ts
export interface ResolutionStep {
  id: string;
  provider: string;
  locale?: LocalePreference;
  region?: RegionPreference;
  orderType?: EpisodeOrderType;
  imageType?: ArtworkType;
  minimumConfidence?: number;
  required?: boolean;
  enabled?: boolean;
}

export interface FieldResolutionPlan {
  version: 1;
  strategy: ResolutionStrategy;
  providers?: string[];
  locales?: LocalePreference[];
  regions?: RegionPreference[];
  steps?: ResolutionStep[];
  skipEmpty: boolean;
  skipInvalid: boolean;
  minimumConfidence?: number;
  useGlobalFallback?: boolean;
  useProviderDefaultFallback?: boolean;
  stopAfterFirstValid: boolean;
}

export type MediaType = 'movie' | 'series' | 'anime';

export interface MediaResolutionConfig {
  fields: Partial<Record<MetadataField, FieldResolutionPlan>>;
}

export interface ResolutionConfig {
  version: 1;
  defaults: MediaResolutionConfig;
  mediaTypes: Partial<Record<MediaType, MediaResolutionConfig>>;
}
```

Plans must be schema-validated (Zod) and versioned. Store no secrets in resolution configuration.

## 10.8 Example plans

Title (locale-first):

```text
Providers: TMDB → TVDB → IMDb
Locales: pt-BR → en-US → original-language
```

Overview (explicit):

```text
TMDB pt-BR → TVDB pt-BR → TMDB en-US → TVDB en-US → TMDB original
```

Logo (locale-first, including no-language artwork):

```text
Providers: RPDB → Fanart.tv → TMDB → TVDB
Locales: pt-BR → no-language → en-US → original-language
```

Series episode order (explicit):

```text
TVDB aired → TVDB absolute → TMDB provider-default → IMDb provider-default
```

Anime episode order (explicit):

```text
Kitsu absolute → TMDB provider-default → TVDB aired → MAL provider-default
```

## 10.9 Configuration hierarchy

```text
System defaults
      ↓
Configuration defaults
      ↓
Media-type override
      ↓
Field override
      ↓
Profile override
      ↓
Catalog override
      ↓
Title-specific local override
      ↓
Verified correction
```

Later levels override earlier levels.

The system must compile inheritance into one **effective plan** before provider calls:

1. load system defaults;
2. merge configuration defaults;
3. apply media-type, field, profile, catalog, and title overrides;
4. validate provider capabilities;
5. expand strategy into steps;
6. remove duplicate attempts;
7. return effective plan with warnings.

## 10.10 Artwork resolution

```ts
export type ArtworkType =
  | 'poster'
  | 'background'
  | 'logo'
  | 'episode-thumbnail';
```

`no-language` is a first-class locale preference for artwork (textless posters, logos without translated text, universal backgrounds). It must not be treated as missing metadata.

When a step returns multiple candidates, rank by:

1. exact requested locale;
2. requested no-language preference;
3. language fallback;
4. configured provider score;
5. image resolution;
6. aspect-ratio compatibility;
7. provider popularity or votes;
8. stable provider ordering.

If an artwork provider does not contain an asset, continue through the configured fallback chain. A missing asset must not create a blank poster when a valid fallback exists.

## 10.11 Episode and season ordering

```ts
export type EpisodeOrderType =
  | 'aired'
  | 'absolute'
  | 'dvd'
  | 'production'
  | 'provider-default'
  | 'community-corrected';
```

Order resolution selects a complete episode structure (seasons, episodes, numbering, identities, specials, mappings), not only a label.

Episode corrections precedence:

```text
Title-specific local override
Verified community correction
Configured provider and order type
Provider fallback
Unresolved
```

Anime may use a different plan than series and must support absolute numbering, split cours, OVA/ONA/specials, and provider-specific season models.

## 10.12 Provider capabilities and adapters

Each provider adapter must declare field-resolution capabilities (field, media types, localization, regions, original/no-language support, order types, artwork types).

The compiler must skip impossible combinations. Skipped attempts remain visible in diagnostics.

```ts
export interface FieldProviderAdapter {
  id: string;
  capabilities: ProviderCapabilities;
  resolveField<T>(
    request: FieldResolutionRequest,
  ): Promise<ProviderFieldResult<T>>;
}
```

Provider results use statuses such as `found`, `empty`, `unsupported`, `not-found`, `invalid`, and `error`.

## 10.13 Resolution algorithm

Default behavior: sequential attempts until the first valid result (`stopAfterFirstValid`).

For each generated step:

1. check capability — skip with reason if unsupported;
2. call the provider;
3. skip empty or invalid values when configured;
4. skip below minimum confidence when configured;
5. select the first valid result, or return unresolved with full attempt history.

`original-language` resolves from the canonical work identity (Identity Graph / primary metadata). Do not silently treat original language as English.

`fallbackUsed` is true when the selected attempt is not the first valid configured preference. Distinguish locale, provider, region, order-type, and correction overrides.

Provider errors must not terminate the chain unless the step is required, a global security failure occurs, configuration is invalid, or the request is cancelled.

Required steps (`required: true`) block later fallbacks when they cannot resolve. Use sparingly.

## 10.14 Resolution result

```ts
export interface FieldResolutionResult<T> {
  status: 'resolved' | 'unresolved' | 'error';
  field: MetadataField;
  mediaType: MediaType;
  value?: T;
  selectedProvider?: string;
  selectedLocale?: string;
  selectedRegion?: string;
  fallbackUsed: boolean;
  confidence?: number;
  attempts: FieldResolutionAttempt[];
  warnings: ResolutionWarning[];
  corrections: AppliedCorrection[];
  effectivePlanHash: string;
  resolvedAt: string;
}
```

Confidence may come from provider trust, Identity Graph mapping, exact locale match, verified correction, heuristic match, or artwork score. Normalize to `0.0–1.0`. Do not present confidence as scientific certainty.

Legacy `FieldResolution<T>` shapes remain conceptually compatible: value, selected provider, attempts, confidence, fallback, warnings, timestamp.

## 10.15 Cache and invalidation

Resolved-field cache keys must include every response-affecting value:

- canonical identity;
- field;
- media type;
- effective plan hash;
- profile and catalog IDs when applicable;
- correction version;
- provider adapter versions.

Never include API keys, OAuth tokens, or edit credentials.

Invalidate only affected fields when priorities, locales, regions, plans, overrides, adapters, corrections, or Identity Graph mappings change.

## 10.16 Management API

```text
GET  /api/v1/configurations/:configId/resolution
PUT  /api/v1/configurations/:configId/resolution
POST /api/v1/resolution/compile
POST /api/v1/resolution/test
```

Compile returns the effective plan for a field/media type/profile/catalog context. Test runs resolution against a sample identity and returns attempts plus the selected result.

## 10.17 Frontend: Resolution Chain Builder

Provide a reusable `ResolutionChainBuilder` used from Appearance, Language & Region, Advanced provider priorities, Anime settings, Episode Order, catalog/profile overrides, and Meta Inspector — not duplicated one-off controls.

Simple mode: strategy (language first / provider first), reorderable languages, reorderable providers, read-only effective-order preview.

Advanced mode: explicit custom attempt lists, capability warnings, test-with-title action.

Warnings must not block save unless the complete plan is invalid.

## 10.18 Legacy migration

Legacy `language`, `provider`, and `artProvider` settings migrate into Field Resolution Plans:

- language → locale chain with sensible English/original fallbacks;
- provider → provider-first chain with system fallbacks;
- artProvider → artwork provider chain with system artwork fallbacks.

Preserve old behavior as closely as possible.

## 10.19 Implementation phases

1. Schema and compiler (inheritance, expansion, validation, tests);
2. Text fields (title, original title, overview, tagline) + Meta Inspector attempts;
3. Artwork (poster, background, logo, no-language ranking);
4. Episode ordering (series + anime) + corrections / Identity Graph;
5. Frontend Resolution Chain Builder;
6. Profile / catalog / title overrides + revision history;
7. Cache, metrics, provider-health integration.

## 10.20 Acceptance criteria

- [ ] Provider and locale priority configurable per field;
- [ ] Locale-first, provider-first, and explicit strategies work;
- [ ] Movies, series, and anime can use different plans;
- [ ] Artwork supports no-language preference;
- [ ] Episode/anime order supports provider and order type;
- [ ] Provider capabilities remove invalid attempts;
- [ ] Effective order is visible before saving;
- [ ] Meta Inspector shows every attempt and fallback explanation;
- [ ] Corrections and profile/catalog overrides behave as documented;
- [ ] Legacy provider settings migrate;
- [ ] Cache keys include effective-plan hash;
- [ ] Secrets never appear in plans or diagnostics;
- [ ] Unit, integration, contract, and UI tests pass.

---

# 11. Meta Inspector

## 11.1 Purpose

Meta Inspector explains the final result.

For any title, it must show:

- canonical MetaLayer identity;
- matched provider IDs;
- selected value for each field;
- provider provenance;
- **full Field Resolution Chain attempts** (provider, locale, region, order type, status, reason);
- fallback attempts and whether fallback was used;
- applied rules;
- applied corrections;
- warnings;
- timing;
- cache status;
- effective plan hash when available.

Suggested inspector tabs:

```text
Overview
Attempts
Provider data
Language
Identity
Corrections
Timing
Raw
```

Attempt examples must look like:

```text
Overview
Requested: pt-BR
1. TMDB · pt-BR — Empty
2. TVDB · pt-BR — Empty
3. TMDB · en-US — Selected
Fallback used: Yes
```

```text
Logo
1. RPDB · pt-BR — Unsupported locale
2. Fanart.tv · No language — Selected
```

```text
Episode order
1. TVDB · Aired — Unavailable
2. TVDB · Absolute — Selected
Correction: Verified community mapping #428
```

## 11.2 Example

```text
The Last of Us

Canonical work:
metalayer:series:01J...

Identity matches:
TMDB: 100088
TVDB: 392256
IMDb: tt3581920
Trakt: 178794

Fields:
Title ............... TMDB pt-BR
Description ......... TMDB pt-BR
Episodes ............ TVDB
Poster ............... RPDB
Background ........... Fanart.tv
Logo .................. TVDB
Rating ................ IMDb
Certification ......... Brazil

Rules:
Included because rating 8.7 >= 7.0
Included because available in Brazil
Included because not watched

Warnings:
Episode numbering differs between TMDB and TVDB.
```

## 11.3 Exclusion explanation

The inspector must explain excluded items.

```text
Excluded:
Runtime is 180 minutes.
Maximum allowed by catalog rule is 150 minutes.
```

---

# 12. Catalog Studio

## 12.1 Purpose

Catalog Studio is the primary catalog-management experience.

Movies, series, and anime catalogs must appear in one ordered workspace.

## 12.2 Catalog sources

Support:

- provider-native catalogs;
- provider discovery endpoints;
- personal lists;
- public lists;
- watchlists;
- recommendations;
- trending;
- popular;
- top-rated;
- upcoming;
- streaming-provider catalogs;
- AI-generated catalogs;
- imported catalogs;
- merged catalogs;
- rule-generated catalogs.

## 12.3 Catalog model

```ts
export interface CatalogDefinition {
  instanceId: string;
  provider: string;
  providerCatalogId: string;
  mediaType: 'movie' | 'series' | 'anime';
  originalName: string;
  customName?: string;
  enabled: boolean;
  showInHome: boolean;
  position: number;
  tags: string[];
  rules?: RuleSet;
  sorting?: SortingPlan;
  appearance?: AppearanceOverrides;
  merge?: MergeDefinition;
  rotation?: RotationDefinition;
}
```

Provider IDs must not be used as unique UI instance IDs.

The same provider catalog may be added multiple times with different settings.

## 12.4 Catalog actions

Every catalog should support:

- rename;
- duplicate;
- delete;
- enable;
- disable;
- show on Home;
- hide from Home;
- reorder;
- move to top;
- move to bottom;
- tag;
- group;
- merge;
- preview;
- apply rules;
- override sorting;
- override artwork;
- export;
- clone to another profile.

## 12.5 Unified ordering

Catalog order in the UI must exactly match manifest order.

Movie, series, and anime catalogs must not be stored in independent order lists unless the manifest intentionally separates them.

## 12.6 Merged catalogs

Supported modes:

```text
Append
Interleave
Weighted mix
Priority fallback
Deduplicated union
Random source
Scheduled source rotation
Daily source rotation
```

### Weighted mix example

```text
Science Fiction Mix

50% TMDB Trending
25% Trakt Popular
25% MDBList Top Science Fiction
```

## 12.7 Stable randomization

Support:

- random per request;
- stable for one hour;
- stable for one day;
- stable for one week;
- stable by profile;
- stable by catalog.

## 12.8 Catalog preview

Preview must show:

- result cards;
- provider source;
- applied rules;
- selected sorting;
- exclusions;
- expected pagination;
- warnings;
- timing.

---

# 13. Rule Studio

## 13.1 Purpose

Rule Studio provides one coherent filtering engine.

Do not implement unrelated top-level booleans for every new filter.

## 13.2 Rule operations

Rules may:

```text
Include
Require
Exclude
Prefer
Boost
Penalize
```

## 13.3 Rule scopes

Rules can apply at:

```text
Global
Profile
Catalog
Home
Full catalog
Search
Recommendations
```

## 13.4 Rule inheritance

Default order:

```text
Global
  ↓
Profile
  ↓
Catalog
  ↓
Context
```

The override semantics must be explicit and testable.

## 13.5 Supported rule fields

Initial target:

- media type;
- genres;
- keywords;
- companies;
- networks;
- studios;
- original language;
- production country;
- year;
- release date;
- digital release date;
- availability region;
- streaming provider;
- monetization type;
- rating;
- vote count;
- runtime;
- certification;
- adult content;
- status;
- number of seasons;
- number of episodes;
- watched state;
- watchlist state;
- artwork presence;
- description presence;
- specials;
- anime format;
- anime season;
- anime studio;
- anime status.

## 13.6 Rule model

```ts
export interface RuleSet {
  includeGenres?: string[];
  requireGenres?: string[];
  excludeGenres?: string[];
  preferGenres?: string[];

  minimumRating?: number;
  minimumVotes?: number;

  yearFrom?: number;
  yearTo?: number;

  runtimeMin?: number;
  runtimeMax?: number;

  originalLanguages?: string[];
  productionCountries?: string[];

  includeNetworks?: string[];
  excludeNetworks?: string[];

  releasedOnly?: boolean;
  digitallyReleasedOnly?: boolean;
  availableInRegion?: string;

  excludeAdult?: boolean;
  maximumCertification?: string;

  hideWatched?: boolean;
  requireArtwork?: boolean;
  hideSpecials?: boolean;
}
```

## 13.7 Provider limitations

Unsupported rules must return a structured warning.

```ts
export interface UnsupportedRuleWarning {
  rule: string;
  provider: string;
  reason: string;
  fallback?: string;
}
```

## 13.8 Search isolation

Catalog discovery rules must not automatically alter normal text search.

Search scopes must be explicit.

## 13.9 Empty results

An empty catalog returns:

```json
{
  "metas": []
}
```

Do not return fake media cards representing errors or empty states.

---

# 14. Sorting Studio

## 14.1 Purpose

Sorting Studio creates multi-step sorting plans.

## 14.2 Sorting plan

```ts
export interface SortingPlan {
  criteria: SortingCriterion[];
  stable: boolean;
  randomSeedWindow?: 'request' | 'hour' | 'day' | 'week';
}
```

## 14.3 Supported criteria

Target criteria:

- provider order;
- source list order;
- popularity;
- trending score;
- relevance;
- title;
- original title;
- rating;
- vote count;
- theatrical release date;
- digital release date;
- list-added date;
- account activity date;
- runtime;
- availability;
- watched status;
- preferred streaming provider;
- random;
- custom score expression.

## 14.4 Context-specific sorting

Support independent sorting for:

- Home row;
- full catalog;
- search;
- recommendations.

Example:

```text
Home:
Digital release date descending

Full catalog:
Title ascending
```

## 14.5 Stable sorting

Sorting must be deterministic when configured as stable.

Ties must use documented fallback fields.

---

# 15. Appearance Studio

## 15.1 Purpose

Appearance Studio controls how metadata appears.

## 15.2 Sections

```text
Posters
Backgrounds
Logos
Titles
Ratings
Certifications
Descriptions
Credits
Episode thumbnails
Metadata links
Live preview
```

## 15.3 Artwork behavior

Artwork resolution uses Field Resolution Chains (§10), including:

- provider priority;
- language priority;
- no-language preference;
- region priority;
- fallback chain;
- image quality / resolution ranking;
- aspect ratio;
- proxying;
- local cache;
- per-content-type settings;
- per-catalog overrides.

UI editing for these chains must reuse `ResolutionChainBuilder` (§10.17).

## 15.4 Metadata display

Support configurable display for:

- cast limit;
- director;
- writer;
- runtime;
- country;
- language;
- status;
- certification;
- ratings;
- studio;
- network;
- collection;
- provider attribution.

## 15.5 Live preview

The UI should show a Stremio-like preview for:

- catalog card;
- movie metadata;
- series metadata;
- episode metadata.

---

# 16. Search and AI

## 16.1 Search modes

Support:

- provider search;
- combined search;
- person search;
- company search;
- network search;
- collection search;
- Smart Discovery;
- Ranked List generation.

## 16.2 Smart Discovery

Natural language should become validated structured filters.

Input:

```text
Investigation movies without horror and under two hours.
```

Output:

```json
{
  "mediaType": "movie",
  "includeGenres": ["Mystery", "Crime"],
  "excludeGenres": ["Horror"],
  "runtimeMax": 120,
  "sort": [
    {
      "field": "popularity",
      "direction": "desc"
    }
  ]
}
```

## 16.3 Ranked List mode

Subjective prompts may generate an ordered list.

Example:

```text
Best science-fiction movies of all time.
```

The AI returns candidate titles in order.

MetaLayer must then:

1. resolve each title to canonical identity;
2. validate type and year;
3. detect duplicates;
4. show unresolved candidates;
5. preserve ranking;
6. allow user edits;
7. save as a catalog.

## 16.4 Explainable AI

Before saving, show:

- interpreted intent;
- generated rules;
- provider selection;
- unresolved items;
- assumptions;
- warnings.

## 16.5 AI safety

AI providers must never receive:

- stored API keys;
- OAuth tokens;
- unrelated configuration;
- private account data;
- full logs.

## 16.6 AI confirmation

AI may propose configuration changes.

AI must not silently change user configuration.

Show a diff and require confirmation.

---

# 17. Anime

## 17.1 First-class media type

Anime must be treated as a first-class content type.

Do not treat anime merely as a special genre of series.

## 17.2 Planned providers and datasets

- AniList;
- MyAnimeList;
- Jikan;
- Kitsu;
- AniDB mappings;
- Fribb anime lists;
- TMDB;
- TVDB;
- IMDb;
- SIMKL where useful.

## 17.3 Required anime features

- anime movies;
- anime series;
- OVA;
- ONA;
- specials;
- split cours;
- absolute numbering;
- franchise relationships;
- studios;
- formats;
- seasonal catalogs;
- weekly schedules;
- airing status;
- watch tracking;
- list catalogs;
- cross-provider IDs.

## 17.4 Jikan resilience

Support:

- configurable public Jikan URL;
- self-hosted Jikan;
- rate-limit handling;
- cache;
- provider health;
- fallback behavior.

## 17.5 Anime identity challenges

The identity layer must support:

- multiple MAL entries mapping to one TV series;
- split seasons;
- split cours;
- movie trilogies;
- specials;
- alternative cuts;
- provider-specific franchise grouping.

---

# 18. Identity Graph

## 18.1 Purpose

Identity Graph maps works and editions across providers.

It is more than a simple ID-conversion function.

## 18.2 Entities

The graph should model:

- work;
- movie;
- series;
- season;
- cour;
- episode;
- special;
- edition;
- collection;
- franchise.

## 18.3 External IDs

Target systems:

- MetaLayer canonical ID;
- TMDB;
- TVDB;
- IMDb;
- Trakt;
- TVmaze;
- MAL;
- AniList;
- Kitsu;
- AniDB;
- SIMKL.

## 18.4 Identity edge

```ts
export interface IdentityEdge {
  source: ExternalIdentity;
  target: ExternalIdentity;
  confidence: number;
  method:
    | 'provider'
    | 'dataset'
    | 'exact-match'
    | 'heuristic'
    | 'community'
    | 'manual';
  verified: boolean;
  evidence: IdentityEvidence[];
  createdAt: string;
  updatedAt: string;
}
```

## 18.5 Confidence

Identity decisions must expose confidence.

Low-confidence mappings must not silently override verified mappings.

## 18.6 Mapping precedence

Recommended precedence:

```text
Verified local correction
Verified community correction
Official provider cross-ID
Trusted external dataset
Exact deterministic match
Heuristic match
Unresolved
```

---

# 19. Correction Hub

## 19.1 Purpose

Correction Hub resolves metadata and identity problems that automatic provider mapping cannot solve.

## 19.2 Correction types

Support:

- wrong external ID;
- missing external ID;
- season reassignment;
- episode reassignment;
- split episode;
- combined episode;
- alternative numbering;
- absolute numbering;
- DVD order;
- broadcast order;
- specials mapping;
- title correction;
- date correction;
- runtime correction;
- certification correction;
- artwork override;
- hidden malformed item.

## 19.3 Correction states

```text
Local
Proposed
Verified
Rejected
Deprecated
Superseded
```

## 19.4 Correction schema

```ts
export interface MetadataCorrection {
  id: string;
  schemaVersion: number;
  target: ExternalIdentity;
  type: CorrectionType;
  payload: unknown;
  reason: string;
  sources: CorrectionSource[];
  author?: string;
  status: CorrectionStatus;
  createdAt: string;
  updatedAt: string;
}
```

## 19.5 Community contribution

Correction files must:

- be schema validated;
- include evidence;
- include tests;
- exclude stream URLs;
- exclude copyrighted media;
- include affected IDs;
- explain expected behavior.

## 19.6 Local overrides

Users may add local corrections without contributing them publicly.

Local overrides take precedence over community corrections.

## 19.7 Correction UI

Show:

- provider values;
- corrected value;
- evidence;
- status;
- affected profiles;
- affected catalogs;
- rollback option.

---

# 20. Tracking and account integrations

## 20.1 Planned integrations

- Trakt;
- SIMKL;
- AniList;
- MyAnimeList;
- TMDB account;
- MDBList where supported.

## 20.2 Features

- watchlist;
- history;
- watched state;
- progress;
- ratings;
- recommendations;
- account lists;
- check-in;
- hide watched;
- profile-specific tracking;
- list import;
- list synchronization.

## 20.3 Token isolation

OAuth tokens must be:

- stored outside normal configuration JSON;
- encrypted;
- scoped by user and provider;
- revocable;
- refreshable;
- never returned in configuration reads.

## 20.4 Failure behavior

Expired or invalid tracking tokens must:

- disable only dependent features;
- preserve unrelated configuration;
- display a clear reconnection state;
- avoid repeated failing refresh attempts.

---

# 21. Profiles

## 21.1 Purpose

Profiles create multiple metadata experiences under one configuration.

## 21.2 Profile overrides

Profiles may override:

- interface locale;
- metadata locale;
- metadata fallback locales;
- title language mode;
- region;
- certification region;
- availability region;
- timezone;
- catalogs;
- rules;
- sorting;
- appearance;
- tracking account;
- certification limits;
- AI preferences.

## 21.3 Example profiles

```text
Silas
Family
Children
Anime
```

## 21.4 Profile manifest route

Target pattern:

```text
/c/:configId/p/:profileId/manifest.json
```

The exact route may change before beta, but must remain stable after beta.

---

# 22. Persistent configuration

## 22.1 Objective

Users install MetaLayer once and edit configuration without reinstalling.

## 22.2 Native route

Target:

```text
/c/:configId/manifest.json
```

## 22.3 Configuration identity

Configuration IDs must be:

- non-sequential;
- unguessable enough for public read access;
- independent of edit credentials;
- stable after updates.

## 22.4 Edit credentials

Use a separate edit credential.

The server stores only a hash.

The edit credential must not appear in the manifest URL.

## 22.5 Configuration schema

Every stored configuration must contain:

```ts
export interface MetaLayerConfig {
  configVersion: number;
  name: string;
  preferences: Preferences;
  localization: LocalizationPreferences;
  sources: SourceReferences;
  catalogs: CatalogDefinition[];
  globalRules: RuleSet;
  globalSorting?: SortingPlan;
  appearance: AppearanceConfig;
  profiles: ProfileDefinition[];
  featureFlags: FeatureFlags;
  createdAt: string;
  updatedAt: string;
}
```

## 22.6 Schema migrations

Every configuration-schema change requires:

- a version increment;
- migration function;
- backward fixture;
- forward test;
- rollback consideration.

## 22.7 Revisions

Configuration updates should create revisions.

Support:

- history;
- compare;
- restore;
- duplicate;
- export.

## 22.8 Export

Default export excludes secrets.

Optional encrypted backup may include secrets.

---

# 23. Secret Vault

## 23.1 Required security

Secret Vault stores:

- API keys;
- OAuth access tokens;
- OAuth refresh tokens;
- provider credentials;
- edit-recovery secrets where applicable.

## 23.2 Encryption

Use authenticated encryption.

Approved examples:

- AES-256-GCM;
- XChaCha20-Poly1305.

Do not invent custom cryptography.

## 23.3 Key management

Use:

```text
METALAYER_ENCRYPTION_KEY
```

The encryption key must not be stored in the database.

## 23.4 Rotation

Design for:

- active key version;
- previous key versions;
- progressive re-encryption;
- explicit rotation tooling.

## 23.5 Frontend exposure

After storage, secrets should normally be shown as:

```text
Connected
Invalid
Expired
Not configured
```

Do not return plaintext secrets to the frontend.

## 23.6 Logging

Never log:

- credentials;
- OAuth tokens;
- edit tokens;
- full legacy URLs containing secrets;
- decrypted vault payloads.

---

# 24. Dashboard

## 24.1 Audience

Dashboard is for instance operators.

It must not be mixed with normal user configuration.

## 24.2 Dashboard modules

```text
Overview
Health
Providers
Users
Configurations
Requests
Errors
Cache
Database
Workers
Logs
Security
Backups
Updates
Settings
```

## 24.3 Metrics

Track:

- request count;
- error rate;
- latency percentiles;
- provider latency;
- provider failures;
- cache hit rate;
- active configurations;
- active users;
- database health;
- queue depth;
- background-job failures.

## 24.4 Logs

Logs must:

- be bounded;
- support redaction;
- support filtering;
- support correlation IDs;
- avoid secret values;
- support operator export.

## 24.5 Runtime settings

Settings changed from the dashboard must declare:

- hot-reload supported;
- worker restart required;
- full process restart required;
- immutable after startup.

---

# 25. Deployment modes

## 25.1 MetaLayer Lite

Target personal deployment:

```text
Single container
SQLite
Memory cache
Optional Redis
Built-in worker
Automatic migrations
```

Goals:

- simple Docker Compose;
- minimal environment variables;
- no external database required;
- suitable for one user or family.

## 25.2 MetaLayer Server

Target public or multi-user deployment:

```text
PostgreSQL
Redis
Background workers
Encrypted Secret Vault
Rate limiting
Read replicas
Object storage where needed
Horizontal scaling
Admin dashboard
```

## 25.3 Architecture shape

Start as a modular monolith.

Do not create microservices prematurely.

Modules should be extractable later if scaling requires it.

---

# 26. Target code architecture

```text
apps/
  server/
  frontend/
  dashboard/
  worker/

packages/
  core/
  config/
  i18n/
  providers/
  metadata-resolver/
  identity-graph/
  corrections/
  catalogs/
  rules/
  sorting/
  appearance/
  tracking/
  security/
  stremio-protocol/
  observability/
  database/
  cache/
  shared-ui/
```

If the existing repository cannot move immediately to this structure, migrate incrementally.

## 26.1 Core rule

Core packages must be provider-neutral.

Provider-specific code belongs in provider adapters.

## 26.2 Provider structure

```text
packages/providers/
  tmdb/
  tvdb/
  imdb/
  tvmaze/
  trakt/
  mdblist/
  simkl/
  anilist/
  mal/
  kitsu/
  fanart/
  rpdb/
```

## 26.3 No giant utility modules

Do not continue adding unrelated responsibilities to large legacy files.

When modifying a large file:

1. identify the responsibility;
2. introduce a test;
3. extract a module;
4. preserve behavior;
5. avoid unrelated rewrites.

---

# 27. API strategy

## 27.1 Stremio routes

Treat Stremio routes as public contracts.

Examples:

```text
/c/:configId/manifest.json
/c/:configId/catalog/:type/:id/:extra?.json
/c/:configId/meta/:type/:id.json
/c/:configId/subtitles/:type/:id/:extra?.json
```

Only advertise resources actually enabled.

## 27.2 Management API

Use versioned routes:

```text
/api/v1/configurations
/api/v1/configurations/:configId
/api/v1/configurations/:configId/revisions
/api/v1/configurations/:configId/preview
/api/v1/configurations/:configId/diagnostics
/api/v1/sources
/api/v1/corrections
/api/v1/identity
```

## 27.3 API errors

Management APIs return structured, locale-neutral errors.

The backend must expose stable error codes and interpolation parameters.
The frontend or consuming client is responsible for localization.

```ts
export interface ApiError {
  code: string;
  message: string;
  correlationId: string;
  details?: unknown;
}
```

Stremio routes return protocol-compatible responses.

Do not use fake metadata items as error messages.

---

# 28. Cache architecture

## 28.1 Cache layers

Distinguish:

- request-level cache;
- in-process memory cache;
- Redis shared cache;
- provider-response cache;
- resolved metadata cache;
- catalog result cache;
- persistent configuration storage.

## 28.2 Cache keys

Never include raw secrets.

Use stable hashes of response-affecting configuration.

## 28.3 Cache invalidation

Configuration updates must invalidate only affected data.

Examples:

- catalog change invalidates manifest and catalog-definition caches;
- artwork change invalidates resolved artwork variants;
- language change invalidates localized metadata variants;
- tracking-state change invalidates watched-state dependent catalogs.

## 28.4 Degraded provider responses

Transient fallback responses must not poison long-lived caches.

Cache entries should record:

- provider health;
- degraded status;
- source;
- expiry;
- stale eligibility.

---

# 29. Resilience

## 29.1 Provider timeout

Every provider has an explicit timeout.

## 29.2 Retry

Retries must:

- be bounded;
- use backoff;
- avoid retrying permanent client errors;
- respect rate limits.

## 29.3 Circuit breaker

Frequently failing providers should enter degraded mode temporarily.

## 29.4 Fallback

Fallback must be observable.

The Meta Inspector and diagnostics must indicate fallback use.

## 29.5 Correlation

Every request should have a correlation ID.

Provider calls should include the same trace context internally.

---

# 30. Security requirements

## 30.1 SSRF

Any server-side remote URL fetch is an SSRF risk.

Required protections:

- protocol allowlist;
- hostname allowlist or signed URLs;
- block loopback;
- block private networks;
- block link-local addresses;
- validate redirects;
- cap response size;
- validate content type;
- apply timeout;
- apply rate limit.

## 30.2 Authentication

Use:

- strong password hashing;
- constant-time comparisons;
- secure session cookies where accounts exist;
- CSRF protection for browser sessions;
- rate limits;
- optional multi-factor support later.

## 30.3 Authorization

Separate:

- public manifest read;
- configuration edit;
- configuration ownership;
- operator dashboard access;
- correction moderation.

## 30.4 Input validation

Validate all external input at boundaries.

Use strict schemas.

Do not rely on TypeScript types alone.

## 30.5 Telemetry

Telemetry must be:

- documented;
- configurable;
- disabled by default for self-hosted users unless explicitly approved otherwise;
- anonymous;
- non-blocking;
- free of secrets.

Suggested variable:

```text
METALAYER_TELEMETRY_ENABLED=false
```

---

# 31. User experience architecture

## 31.1 Main navigation

```text
MetaLayer

Search settings

Overview
Sources
Catalog Studio
Rules
Sorting
Appearance
Search & AI
Tracking
Corrections
Profiles
Advanced
Save & Install

Dashboard
Documentation
Donate
```

## 31.2 Simple mode

Show:

- Overview;
- Sources;
- Language & Region;
- Catalog Studio;
- basic Rules;
- Appearance;
- Save & Install.

Simple mode should use presets.

## 31.3 Advanced mode

Show:

- field-level provider resolution;
- independent locale and regional preferences;
- metadata language fallback chains;
- rule inheritance;
- contextual sorting;
- Identity Graph;
- Correction Hub;
- cache;
- proxy;
- diagnostics;
- experimental features.

## 31.4 Command palette

Support:

```text
Search settings
Create catalog
Connect Trakt
Test TMDB
Open diagnostics
Export configuration
Install addon
Switch mode
```

## 31.5 Mobile first

All configuration pages must work on narrow mobile screens.

Avoid desktop-only drag-and-drop.

Provide accessible move controls as alternatives.

## 31.6 Accessibility

Target:

- keyboard navigation;
- visible focus;
- semantic labels;
- screen-reader descriptions;
- sufficient contrast;
- reduced-motion support.

---

# 32. Presets

Initial presets may include:

```text
Recommended
Family Friendly
Only Available Content
Brazilian Content
High Rated
Recent Releases
No Anime
Anime Focus
Minimal Metadata
Rich Artwork
```

Presets generate normal configuration.

Users can edit presets after applying them.

Presets must not create hidden special behavior.

---

# 33. Testing strategy

## 33.1 Required test categories

- unit tests;
- schema tests;
- migration tests;
- contract tests;
- integration tests;
- provider adapter tests;
- internationalization tests;
- localization coverage tests;
- pseudo-locale and RTL tests;
- security tests;
- performance tests;
- end-to-end tests;
- UI accessibility tests.

## 33.2 Unit-test targets

- rule evaluation;
- sorting;
- identity confidence;
- field resolution;
- locale negotiation;
- metadata fallback chains;
- provider locale conversion;
- localized catalog-name fallback;
- plural and interpolation validation;
- correction precedence;
- cache-key generation;
- secret redaction;
- schema migrations;
- catalog merging;
- stable randomization.

## 33.3 Contract-test targets

- manifest;
- movie catalog;
- series catalog;
- anime catalog;
- movie metadata;
- series metadata;
- anime metadata;
- search;
- legacy URL compatibility;
- persistent configuration;
- profile manifest;
- empty results;
- degraded providers.

## 33.4 Provider tests

Normal CI must use mocks.

Optional smoke tests may use repository secrets.

## 33.5 Migration fixtures

Maintain fixtures for:

- old language-only config;
- TMDB account config;
- Trakt config;
- MDBList config;
- RPDB config;
- full legacy config;
- malformed legacy config;
- older MetaLayer schema versions;
- configurations with different interface and metadata locales;
- configurations with locale-specific catalog names;
- right-to-left pseudo-locale configurations.

## 33.6 Required commands

Target commands:

```bash
pnpm lint
pnpm typecheck
pnpm i18n:check
pnpm test
pnpm test:integration
pnpm test:e2e
pnpm build
```

---

# 34. Performance objectives

Initial objectives for cached requests:

```text
Manifest ............. p95 < 100 ms
Catalog .............. p95 < 250 ms
Metadata ............. p95 < 200 ms
Configuration read ... p95 < 150 ms
Configuration save ... p95 < 700 ms
```

Initial objectives for uncached requests:

```text
Catalog .............. p95 < 2.0 s
Metadata ............. p95 < 2.5 s
Search ............... p95 < 2.5 s
```

These are objectives, not excuses to return incomplete data silently.

Performance tests must identify:

- provider time;
- resolver time;
- rules time;
- sorting time;
- cache time;
- serialization time.

---

# 35. Observability

## 35.1 Metrics

Use metrics for:

- latency;
- errors;
- cache;
- provider health;
- queue;
- database;
- configuration operations.

## 35.2 Tracing

Trace:

```text
Incoming request
Configuration resolution
Provider calls
Identity resolution
Metadata resolution
Rules
Sorting
Serialization
```

## 35.3 Diagnostics page

Per configuration, show:

- manifest validity;
- provider health;
- missing credentials;
- unsupported rules;
- last errors;
- cache state;
- migration state;
- installed route;
- expected resources.

---

# 36. Documentation

Required documents:

```text
README.md
AGENTS.md
CHANGELOG.md
SECURITY.md
CONTRIBUTING.md

docs/
  architecture.md
  migration-from-tmdb-addon.md
  configuration.md
  internationalization.md
  translation-guide.md
  language-region.md
  sources.md
  catalogs.md
  rules.md
  sorting.md
  appearance.md
  field-resolution-chains.md
  search-ai.md
  tracking.md
  anime.md
  identity-graph.md
  corrections.md
  profiles.md
  self-hosting.md
  security.md
  telemetry.md
  deployment.md
  versioning.md
  deprecations.md
```

Documentation must reflect runtime behavior.

Canonical Field Resolution Chains requirements live in `AGENTS.md` §10. `docs/field-resolution-chains.md` is the short index for that subsystem.

Do not claim that a dependency or subsystem was removed while executable support remains.

---

# 37. Development phases toward 1.0.0

Phases are product milestones, not separate major versions.

The version remains in the `1.0.0` prerelease line until stable.

## 37.0 Progress snapshot (2026-07-12)

| Phase | Name | Status | Exit doc |
|---|---|---|---|
| A | Repository baseline | **Complete** | `docs/phase-a-exit.md` |
| B | Security and persistence | **Core complete** (key rotation tooling deferred) | `docs/phase-b-exit.md` |
| C | Provider framework | **Core complete** (Redis shared cache deferred) | `docs/phase-c-exit.md` |
| D | Catalog Studio | **Complete** (native Stremio catalog route follow-up) | `docs/phase-d-exit.md` |
| E | Rule and Sorting Studios | **Complete** | `docs/phase-e-exit.md` |
| F | Metadata Resolver and Meta Inspector | **Complete** (F1 + F2 Field Resolution Chains; inheritance/episode UX follow-ups) | `docs/phase-f-exit.md` |
| G | Identity Graph | **Complete** | `docs/phase-g-exit.md` |
| H | Anime | **Complete** (foundations; richer UX later) | `docs/phase-h-exit.md` |
| I | Tracking | **Complete** (OAuth browser flows / live sync follow-up) | `docs/phase-i-exit.md` |
| J | Correction Hub | **Complete** | `docs/phase-j-exit.md` |
| K | Search and AI | **Complete** | `docs/phase-k-exit.md` |
| L | Dashboard and deployment | **Complete** | `docs/phase-l-exit.md` |
| M | Beta stabilization | **In progress** (`1.0.0-beta.1`) | `docs/phase-m-exit.md` |
| N | Release candidate | **Not started** | — |
| O | Stable launch `1.0.0` | **Not started** | — |

**Current prerelease posture:** `1.0.0-beta.1` (Phase M). Remaining gaps are tracked as explicit beta deferrals in `docs/phase-m-exit.md`.

### Cross-cutting work already landed after Phase L (frontend track)

- HeroUI v3 + React 19 + Tailwind v4 + `@metalayer/shared-ui` (ADR 0007);
- configure `/configure` and admin `/admin` basenames; API serves SPA dist;
- configure shell: Simple/Advanced, theme, command palette (`Ctrl+K`);
- TanStack Query + RHF + Zod pattern (Sources model; Tracking/Corrections migrated);
- Layered Minimalism page primitives (`PageHeader`, `SectionCard`, empty/error/loading);
- Language & Region configure UI + `GET/PUT .../localization` (`docs/language-region.md`);
- Save & Install configure UI + native `/c/:configId/catalog|meta` routes.

### Highest-priority gaps during Phase M (beta)

See `docs/phase-m-exit.md` for the full deferred list. Near-term:

1. **Profiles UI + profile manifest route**
2. **Series/anime native meta**
3. **Tracking OAuth browser flows** and live list sync
4. **Postgres + Redis** Server end-to-end
5. **UX / a11y / i18n / performance / security** hardening (Phase M checklist)
6. **Encryption key rotation tooling** (Phase B carry-over)

---

## Phase A — Repository baseline

Suggested prerelease range:

```text
1.0.0-alpha.1+
```

Tasks:

- establish CI;
- add test runner;
- add legacy fixtures;
- document current routes;
- decouple manifest identity from package name;
- create versioned configuration schema;
- create locale registry and locale negotiation;
- introduce translation namespaces;
- replace foundational hard-coded interface strings;
- define structured API error codes;
- add pseudo-locales;
- add ADR process;
- define code ownership boundaries.

Exit:

- legacy behavior is covered by contract tests.

**Status (2026-07-11): complete.** See `docs/phase-a-exit.md`.

## Phase B — Security and persistence

Tasks:

- persistent configuration;
- edit credentials;
- Secret Vault;
- encryption;
- safe logs;
- safe exports;
- legacy import;
- revision history.

Exit:

- new configurations contain no secrets in URLs.

**Status (2026-07-11): core complete.** Key rotation / progressive re-encryption tooling deferred. See `docs/phase-b-exit.md`.

## Phase C — Provider framework

Tasks:

- provider interfaces;
- capability registry;
- provider locale adapters;
- localized capability declarations;
- locale-sensitive cache strategy;
- provider health;
- timeout and retry policies;
- TMDB adapter;
- artwork adapters;
- rating adapters;
- provider diagnostics.

Exit:

- core is provider-neutral.

**Status (2026-07-12): core complete.** Redis shared cache deferred for Server mode. See `docs/phase-c-exit.md`.

## Phase D — Catalog Studio

Tasks:

- unified ordering;
- catalog instances;
- preview;
- rename;
- duplicate;
- tags;
- groups;
- merged catalogs;
- rotations;
- imports and exports.

Exit:

- catalog UI order equals manifest order.

**Status (2026-07-12): complete.** Native Stremio catalog *result* route remains a follow-up (manifest lists studio catalogs; Studio preview serves pages). See `docs/phase-d-exit.md`.

## Phase E — Rule and Sorting Studios

Tasks:

- rule model;
- inheritance;
- contexts;
- provider limitations;
- multi-step sorting;
- stable randomization;
- explanations.

Exit:

- rules and sorting are independently testable.

**Status (2026-07-12): complete.** See `docs/phase-e-exit.md`.

## Phase F — Metadata Resolver and Meta Inspector

### F1 — Baseline (landed)

Tasks completed:

- field-level provider selection with provenance;
- locale-aware fallbacks and title/description modes;
- confidence and exclusion reasons;
- inspect API + minimal Meta Inspector UI.

Exit (baseline):

- every resolved field can explain its source.

**Status (2026-07-12): baseline complete.** See `docs/phase-f-exit.md`.

### F2 — Field Resolution Chains (landed)

Canonical design: §10.

Shipped:

- versioned `FieldResolutionPlan` / `ResolutionConfig` schemas + Zod validation;
- plan derivation from `fieldProviders` and strategy expansion (`locale-first`, `provider-first`, `explicit`);
- runtime resolve with attempt diagnostics and `effectivePlanHash`;
- management APIs (`GET/PUT .../resolution`, compile, test);
- `ResolutionChainBuilder` on Appearance (title / description / poster);
- Meta Inspector attempt list (provider · locale · status · reason);
- `resolution` i18n namespace (en-US / pt-BR / es-ES).

Deferred follow-ups (documented in `docs/phase-f-exit.md`): full profile/catalog/title inheritance UI, advanced explicit step editor, episode-order chain wiring, dedicated artwork no-language ranking, shared-cache plan hashes.

**Status (2026-07-12): product-complete** (F1 + F2). See `docs/phase-f-exit.md`.

## Phase G — Identity Graph

Tasks:

- canonical IDs;
- provider edges;
- confidence;
- evidence;
- cache;
- graph diagnostics.

Exit:

- cross-provider mappings are observable and testable.

**Status (2026-07-12): complete.** See `docs/phase-g-exit.md`.

## Phase H — Anime

Tasks:

- AniList;
- MAL/Jikan;
- Kitsu;
- Fribb;
- anime catalogs;
- anime identity;
- split cours;
- absolute numbering;
- anime tracking foundations.

Exit:

- anime is a first-class supported type.

**Status (2026-07-12): complete** (foundations). Richer anime-only Appearance/order UI can build on Field Resolution Chains F2. See `docs/phase-h-exit.md`.

## Phase I — Tracking

Tasks:

- Trakt;
- SIMKL;
- AniList;
- MAL;
- watchlists;
- history;
- progress;
- hide watched;
- token refresh;
- reconnection states.

Exit:

- tracking failures do not break metadata.

**Status (2026-07-12): complete** for failure isolation + adapters/foundation. Full OAuth browser flows and live watchlist/history sync remain follow-ups. See `docs/phase-i-exit.md`.

## Phase J — Correction Hub

Tasks:

- correction schema;
- local overrides;
- community files;
- episode mapping;
- alternative orders;
- moderation;
- correction UI.

Exit:

- corrections are independent of provider code.

**Status (2026-07-12): complete.** See `docs/phase-j-exit.md`.

## Phase K — Search and AI

Tasks:

- combined search;
- Smart Discovery;
- Ranked List;
- structured validation;
- explainability;
- save as catalog;
- AI assistant proposals.

Exit:

- AI never bypasses the rules and schema layers.

**Status (2026-07-12): complete.** See `docs/phase-k-exit.md`.

## Phase L — Dashboard and deployment

Tasks:

- operator dashboard;
- logs;
- metrics;
- backups;
- MetaLayer Lite;
- MetaLayer Server;
- Docker;
- GHCR;
- hosted deployment;
- upgrade tooling.

Exit:

- personal and public deployment paths are documented.

**Status (2026-07-12): complete.** SPA static serving under `/configure` and `/admin` added after exit. Postgres Server persistence and Redis cache wiring remain follow-ups. See `docs/phase-l-exit.md`.

## Phase M — Beta stabilization

Version:

```text
1.0.0-beta.N
```

**Status (2026-07-12): in progress** — entered at `1.0.0-beta.1`. See `docs/phase-m-exit.md`.

Tasks:

- feature freeze;
- UX review;
- accessibility;
- performance;
- migration testing;
- provider reliability;
- security review;
- translation review;
- complete en-US, pt-BR, and es-ES catalogs;
- pseudo-locale and RTL layout review;
- metadata fallback / Field Resolution Chains review;
- documentation.

Exit:

- all 1.0 feature categories are implemented (or explicitly deferred with release notes).

## Phase N — Release candidate

Version:

```text
1.0.0-rc.N
```

**Status: not started.**

Tasks:

- no new features;
- critical fixes only;
- deployment rehearsal;
- backup restore rehearsal;
- migration rehearsal;
- final security review;
- release notes;
- launch documentation.

Exit:

- candidate is suitable for stable release.

## Phase O — Stable launch

Version:

```text
1.0.0
```

**Status: not started.**

Stable launch requires every release gate below (§38) and Definition of done (§42).

---

# 38. Release gates for 1.0.0

## 38.1 Feature gate

Required:

- persistent configuration;
- Secret Vault;
- TMDB migration;
- multi-source metadata;
- complete en-US, pt-BR, and es-ES interface localization;
- configurable metadata language and fallback chain;
- independent content, certification, and availability regions;
- localized catalog names;
- artwork fallbacks;
- movies;
- series;
- anime;
- Catalog Studio;
- merged catalogs;
- Rules;
- Sorting;
- Search;
- AI catalogs;
- Identity Graph;
- Corrections;
- profiles;
- tracking;
- dashboard;
- Lite deployment;
- Server deployment.

## 38.2 Superiority gate

MetaLayer must demonstrate:

- field-level provenance;
- rule explanations;
- exclusion explanations;
- encrypted credentials;
- revision history;
- local and community corrections;
- contextual sorting;
- Simple and Advanced modes;
- provider capability warnings;
- visible metadata-language fallback explanations;
- Simple and Advanced language and region controls;
- RTL-ready interface foundations.

## 38.3 Reliability gate

Required:

- no known critical bugs;
- no known secret leaks;
- migration tests pass;
- backup restore passes;
- database migrations pass;
- provider failures degrade safely;
- locale-sensitive caches do not cross-contaminate responses;
- translation validation passes;
- pseudo-locale layout tests pass;
- performance objectives are measured;
- Docker images are reproducible;
- release artifacts are signed where practical.

## 38.4 Documentation gate

Required:

- installation;
- migration;
- provider setup;
- language and region behavior;
- translation contribution;
- security;
- self-hosting;
- upgrade;
- rollback;
- troubleshooting;
- API behavior.

---

# 39. Pull request rules

Every PR must:

- have one primary purpose;
- state compatibility impact;
- state security impact;
- state migration impact;
- state deployment impact;
- include tests;
- update documentation;
- add translation keys for user-facing text;
- preserve locale placeholders and plural behavior;
- avoid unrelated formatting changes.

## 39.1 Recommended PR sequence

Examples:

```text
test: add legacy manifest fixtures
refactor: introduce versioned config schema
feat: add locale registry and translation foundation
refactor: replace API message strings with error codes
refactor: decouple manifest identity
feat: add persistent configuration store
security: add encrypted secret vault
feat: add provider capability registry
feat: add unified catalog model
feat: add rule engine
feat: add sorting plans
feat: add field resolution chains
feat: add metadata provenance
feat: add identity graph
feat: add correction registry
```

## 39.2 Commit style

Use Conventional Commits:

```text
feat:
fix:
refactor:
test:
docs:
security:
perf:
chore:
ci:
build:
```

## 39.3 Breaking changes

A breaking change commit must include:

```text
BREAKING CHANGE:
```

During `1.0.0-alpha`, breaking prerelease changes are permitted but must still be documented.

During beta and RC, breaking changes require maintainer approval.

After stable `1.0.0`, breaking changes require a major release.

---

# 40. Agent workflow

## 40.1 Before editing

1. Read `AGENTS.md`.
2. Inspect current code.
3. Inspect relevant schemas.
4. Inspect public routes.
5. Inspect migrations.
6. Inspect tests.
7. Identify compatibility risk.
8. Identify security risk.
9. Plan the smallest safe change.

## 40.2 While editing

1. Preserve contracts.
2. Validate inputs.
3. Avoid secret exposure.
4. Keep core provider-neutral.
5. Use translation keys for user-facing text.
6. Preserve locale and region separation.
7. Add tests.
8. Add diagnostics.
9. Update documentation.
10. Avoid unrelated rewrites.

## 40.3 Before finishing

Run:

```bash
pnpm lint
pnpm typecheck
pnpm i18n:check
pnpm test
pnpm build
```

When relevant, also run:

```bash
pnpm test:integration
pnpm test:e2e
```

Then verify:

- one legacy manifest;
- one native MetaLayer manifest;
- one catalog preview;
- one metadata response;
- one provider failure;
- one configuration migration;
- one non-English interface locale;
- one metadata fallback chain;
- one pseudo-locale layout;
- no secrets in URLs or logs.

---

# 41. Decision rules

## Should MetaLayer add a provider immediately?

Only after the provider framework and capability model support it.

## Should MetaLayer choose one provider for an entire title?

Only when the user configures that behavior. Default model is Field Resolution Chains per field (§10).

## Should unsupported rules be ignored?

No.

## Should language and region be represented by one setting?

No. Interface locale, metadata locale, availability region, certification region, and release region are independent concepts.

## Should the backend return only translated error messages?

No. Return stable error codes and parameters. Translate at the client boundary.

## Should user-facing strings be hard-coded in components?

No. Use semantic translation keys.

## Should provider locale limitations be hidden?

No. Declare capabilities and show fallback behavior.

## Should full metadata be loaded for every catalog item?

No. Use lightweight previews.

## Should errors be represented as media cards?

No.

## Should secrets be stored in configuration JSON?

No. Store references to encrypted vault entries.

## Should package name control manifest ID?

No.

## Should the project preserve the old version number?

No. MetaLayer starts at `1.0.0`.

## Should the first public build be `0.x`?

No.

## Can prereleases use `1.0.0-alpha.N`?

Yes.

## Should the project copy competitor code to gain parity faster?

No.

## Should AI modify configuration automatically?

No. Show a diff and require confirmation.

## Should corrections live inside provider implementations?

No. Corrections are a separate layer.

## Should simple users see every advanced option?

No. Use progressive disclosure.

## Should MetaLayer release quickly with unfinished architecture?

No.

---

# 42. Definition of done

MetaLayer migration and reconstruction are complete when every item below is checked.

Progress note (2026-07-12): Phase **M** (`1.0.0-beta.1`) is in progress. Phases A–L landed; remaining work is tracked as beta deferrals and Phase M hardening in `docs/phase-m-exit.md`.

- [x] MetaLayer is the primary brand for greenfield apps (`apps/frontend`, `apps/dashboard`, `apps/server`).
- [ ] The stable version is `1.0.0` (still on `1.0.0-beta.*`).
- [x] Legacy TMDB Addon configurations can be imported (`import-legacy` API).
- [x] Legacy routes remain supported for the documented window.
- [x] Native configurations do not expose secrets in URLs.
- [x] Secrets are encrypted at rest (Secret Vault AES-256-GCM).
- [ ] Interface localization is complete for en-US, pt-BR, and es-ES (catalogs exist; primary UI still incomplete).
- [x] Interface, metadata language, and regional settings are independent in the configure UI (Language & Region; Simple syncs, Advanced separates).
- [x] Metadata fallback chains are configurable and explainable via Field Resolution Chains (§10 F2; inheritance UX follow-up).
- [ ] Catalog names support localization end-to-end in UI.
- [x] API errors use stable codes.
- [ ] Dates, numbers, durations, and plurals are localized across the UI.
- [ ] RTL foundations and pseudo-locales are tested in layout.
- [x] Catalog order is unified (Studio ↔ manifest).
- [x] Rules are hierarchical and contextual.
- [x] Sorting supports multiple criteria.
- [x] Metadata fields have provider provenance (baseline resolver).
- [x] Field Resolution Chains support locale-first, provider-first, and explicit strategies (§10 F2).
- [x] Meta Inspector explains results and resolution attempts (deeper attempt UX polish still open).
- [x] Identity Graph supports provider mappings.
- [x] Correction Hub supports local and community corrections.
- [x] Anime is first-class (foundations).
- [x] Tracking integrations are isolated and recoverable (OAuth browser flows / live sync still follow-up).
- [ ] Profiles are supported end-to-end (UI + profile manifest route incomplete).
- [x] Revision history and rollback work.
- [x] Simple and Advanced modes exist (configure shell).
- [x] Dashboard supports operators (token-gated API + UI).
- [x] Lite and Server deployments are documented (Postgres/Redis wiring still follow-up).
- [x] CI enforces lint, types, tests, and build.
- [ ] Security review passes.
- [ ] Migration review passes.
- [ ] Stable release gates pass (§38).

---

# 43. Final direction

MetaLayer must not win only by having more integrations.

MetaLayer must be the best because it offers:

```text
More control
Better metadata
Clear explanations
Safer credentials
Stronger corrections
Predictable behavior
Excellent user experience
True multilingual and regional support
Reliable architecture
```

Every proposed feature should answer at least one question:

- Does it improve metadata quality?
- Does it give users more control?
- Does it improve provider interoperability?
- Does it explain system behavior?
- Does it correct a real metadata problem?
- Does it improve security?
- Does it improve reliability?
- Does it improve maintainability?
- Does it improve migration?
- Does it improve multilingual or regional behavior?
- Does it improve the Stremio experience?

If the answer is no, the feature should not be prioritized.
