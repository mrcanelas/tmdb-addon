# Performance measurement

MetaLayer tracks request latency toward the objectives in `AGENTS.md` §34.

## Runtime metrics

`MetricsRegistry` keeps a bounded sample ring and exposes:

- `avg` / `max`
- `p50` / `p95` / `p99`

These appear in dashboard/health snapshots under `requestLatencyMs`.

## Harness

```bash
# Default: measure with sanity ceilings (CI-safe)
pnpm test:perf

# More samples
METALAYER_PERF_ITERATIONS=50 pnpm test:perf

# Fail if cached objectives are missed (opt-in; machine-dependent)
METALAYER_PERF_STRICT=true pnpm test:perf
```

The harness warms each route twice, then records percentiles for:

| Route | Cached objective (p95) |
|---|---|
| Native manifest | < 100 ms |
| Native catalog | < 250 ms |
| Native metadata | < 200 ms |
| Configuration read | < 150 ms |
| Configuration save | < 700 ms |

Providers are mocked so the run measures MetaLayer path cost, not TMDB network variance.

## Phase M posture

Measurement is **Done (MVP)**. Hard enforcement of §34 on every CI machine remains optional via `METALAYER_PERF_STRICT` until baseline hardware is standardized.
