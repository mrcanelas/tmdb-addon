# Telemetry

Self-hosted MetaLayer instances keep telemetry **off by default**.

```text
METALAYER_TELEMETRY_ENABLED=false
```

When enabled (`true`), telemetry must remain:

- documented;
- anonymous;
- non-blocking;
- free of secrets (API keys, OAuth tokens, edit credentials, vault payloads).

Runtime exposure: `@metalayer/observability` health / settings snapshot reads `METALAYER_TELEMETRY_ENABLED`. See also `.env.example` and `docs/deployment.md`.

Canonical requirements: `AGENTS.md` §30.5.
