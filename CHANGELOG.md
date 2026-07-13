# Changelog

All notable changes to MetaLayer are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/) as defined in `AGENTS.md` §5.

## [Unreleased]

## [1.0.0-beta.1] — 2026-07-12

### Added

- Native MetaLayer configure SPA (`/configure`) and operator dashboard (`/admin`)
- Persistent configurations with Secret Vault (AES-256-GCM) and edit credentials
- Catalog Studio, Rules, Sorting, Appearance (Field Resolution Chains), Search & AI
- Identity Graph, Correction Hub, anime foundations, tracking OAuth (Trakt / SIMKL / AniList / MAL)
- Process-scoped provider health registry and OAuth redirect allowlist
- Locale catalogs for en-US / pt-BR / es-ES plus en-XA / ar-XB pseudo-locales

### Changed

- Product version line starts at `1.0.0-beta.1` (does not continue TMDB Addon `3.x`)
- Manifest identity `community.metalayer` (ADR 0001)

### Security

- Secrets stay out of manifest URLs; dashboard token redacted from logs
- Tracking OAuth `redirectUri` allowlisted per instance

Phase status and deferrals: `docs/phase-m-exit.md`.
