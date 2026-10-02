# ADR 0009 — Profile overrides

- Status: Accepted
- Date: 2026-10-02

## Context

Profiles already supported localization and catalog subsetting. AGENTS.md §21 also calls for rules, sorting, appearance, and tracking overrides per profile.

## Decision

Extend `ProfileDefinition` with additive optional fields (config schema version stays `1`):

- `rules?: RuleSet` — keys set on the profile override `globalRules` via `mergeProfileRules`
- `sorting?: SortingPlan` — replaces `globalSorting` when set
- `presentation?: Partial<PresentationConfig>` — shallow-merged onto config presentation (same field name as `MetaLayerConfig.presentation`)
- `trackingProvider?: 'trakt' | 'simkl' | 'anilist' | 'mal'` — preferred tracking provider for hide-watched / future sync; tokens remain in the Secret Vault

`applyProfileToConfig` applies these merges before native manifest/catalog/meta serving. Catalog window cache keys include `profileId`.

Configure UI: `/configure/profiles` tabs edit the full `ProfileDefinition` and persist via existing `PUT .../profiles`.

## Consequences

- Backward compatible: older configs without the new fields continue to parse.
- Full Rule Studio / Sorting Studio editors are not duplicated; the profile page exposes a pragmatic subset.
- Tracking provider selection does not create OAuth connections by itself.

## Still follow-up

- Clone profile across configurations
- Richer family onboarding presets
