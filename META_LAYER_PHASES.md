# MetaLayer phases (index)

This file is a **short status index** for humans and agents.

**Authority (do not renumber phases here):**

- [`AGENTS.md`](AGENTS.md) §37 — phases A–O toward `1.0.0`
- [`docs/phase-m-exit.md`](docs/phase-m-exit.md) — Phase M checklist and deferrals
- Product modules, Field Resolution Chains, and release gates: `AGENTS.md` §§7–38

An earlier ChatGPT draft that restarted at “Phase A ~70%” and renumbered B–L is **obsolete**. Do not use it for planning.

---

## Current status

**Phase M — Beta stabilization** (`1.0.0-beta.1`), in progress.

| Phase | Name | Status |
|---|---|---|
| A–L | Baseline → Dashboard / deployment | **Complete** (MVP; see phase exit docs) |
| M | Beta stabilization | **In progress** |
| N | Release candidate | Not started |
| O | Stable `1.0.0` | Not started |

**Monorepo:** MetaLayer-only on the active line (`apps/`, `packages/`, `docker/`). The Express TMDB Addon + Vite configure UI live on branch [`legacy/tmdb-addon-3.1.7`](https://github.com/mrcanelas/tmdb-addon/tree/legacy/tmdb-addon-3.1.7). Compressed legacy Stremio URLs (`/:catalogChoices/...`) are hosted by `apps/server` with LEGACY manifest identity; native installs use `/c/:configId/...`.

---

## Shipped (MVP summary)

Already on the MetaLayer line (not an exhaustive feature list):

- Persistent configs, Secret Vault, revisions, safe export, legacy **import**
- Provider framework + Sources UI; TMDB / artwork / ratings / anime adapters (coverage varies)
- Catalog Studio (CRUD, order, preview, merge foundations)
- Rules + Sorting studios
- Field Resolution Chains + Metas / Fields UI (simple chains) + Meta Inspector
- Language & Region, Appearance / presentation bridges
- Identity Graph, Corrections, Tracking OAuth MVPs, Profiles + profile manifests
- Search & AI (confirm-before-apply)
- Save & Install (native manifest URL)
- Operator Dashboard + Lite/Server Docker paths
- Configure shell (Simple/Advanced), i18n en-US / pt-BR / es-ES foundations, RTL/pseudo MVP

Details and remaining deferrals: `docs/phase-*-exit.md`, especially `docs/phase-m-exit.md`.

---

## Next (priority order)

Work that actually moves Phase M → N → `1.0.0`. Order is intentional.

1. **Admin-first instance settings** — Dashboard Providers / Settings for day-two secrets (ADR 0008); stop growing bootstrap `.env` for operator credentials.
2. **Legacy URL parity gaps** — on MetaLayer compat routes, deepen support for common compressed-config catalogs (e.g. MDBList) and artwork (e.g. RPDB) where installs still depend on them; unsupported ids stay `{ metas: [] }`.
3. **Field Resolution Chains depth** — profile / catalog / title inheritance UX and episode-order chain follow-ups (`AGENTS.md` §10, `docs/field-resolution-chains.md`).
4. **Docs + merge hygiene** — complete §36 gaps that still lag runtime; land the feature branch to `main` when maintainers are ready (root package name may stay `tmdb-addon` until a dedicated rename window).
5. **Phase N → O** — RC freeze, security/migration sign-off as release gates, then stable `1.0.0` (`AGENTS.md` §§38, 42).

Also track non-blocking DoD items (catalog display-name localization end-to-end, Advanced configure beyond MVP) via `AGENTS.md` §42 and Phase M deferrals — do not invent a parallel phase letter for them.

---

## Icebox (not 1.0 scope)

Ideas that appeared in the discarded ChatGPT roadmap. They may inform later minors/majors; they are **not** Phase M work and must not block `1.0.0`:

- Plex / Jellyfin as catalog providers
- Rules that force values, regex-replace metadata, or call AI inside the rule engine (Rules ≠ Field Resolution)
- clearArt / extra artwork kinds beyond the current resolvable set without schema design
- Tracking calendar / continue-watching product surface beyond existing watch-state MVP
- Community marketplace, cloud sync, preset sharing, plugins (`v2.0`-class)
- Full “Developer Mode” playground (Inspector already covers provenance; deeper tools are polish)

When promoting an icebox item, add it to `AGENTS.md` / an ADR first — never by renumbering A–O here.
