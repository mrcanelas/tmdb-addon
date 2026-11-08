# ADR 0006: Stremio public IDs default to IMDb

- Status: Accepted
- Date: 2026-07-11
- Deciders: MetaLayer maintainers

## Context

Stremio stream addons and Cinemeta conventionally key titles by IMDb ids (`tt…`).
The legacy TMDB Addon defaulted many responses to `tmdb:{id}` unless `returnImdbId` was enabled, which reduced cross-addon compatibility.

MetaLayer still needs a separate **canonical** identity for the Identity Graph (`metalayer:…`). That is not the same as the **public Stremio `meta.id` / catalog item id** clients see.

## Decision

1. For Stremio protocol payloads (catalog metas and meta responses), the default public id is the IMDb id when known (`tt1234567`).
2. If IMDb is missing, fall back to `tmdb:{tmdbId}` (and later other provider-prefixed ids as needed).
3. Users may override via configuration preference `identity.stremioPublicId`:
   - `imdb` (default)
   - `tmdb`
4. Manifest `idPrefixes` for native MetaLayer mode must advertise both `tt` and `tmdb:` when IMDb-default mode is active.
5. Canonical MetaLayer work ids remain independent and must not be replaced by IMDb ids internally.

## Consequences

- Better stream-addon matching out of the box.
- Native routes and previews must resolve both `tt…` and `tmdb:…` inputs.
- Legacy import maps `returnImdbId=true` → `stremioPublicId=imdb` and `false` → `tmdb`.

## Alternatives considered

- Keep `tmdb:` as default for continuity with TMDB Addon: rejected; hurts Stremio ecosystem interoperability.
- Use only MetaLayer canonical ids in Stremio payloads: rejected for 1.0; stream addons do not understand them yet.
