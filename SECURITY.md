# Security Policy

## Secrets

Never commit real credentials to this repository.

Do **not** put secrets in:

- `Dockerfile` (`ENV` with API keys, tokens, passwords, or connection strings)
- source code
- commit messages
- cache keys
- public configuration URLs
- CI workflow files (use GitHub Actions secrets)

Use:

- local `.env` (gitignored)
- `.env.example` with placeholders only
- Docker Compose `env_file` / runtime environment
- orchestrator secret stores in production

If a secret is exposed in git history, rotate it immediately and treat it as compromised.

## MetaLayer direction

MetaLayer will store API keys and OAuth tokens in an encrypted Secret Vault.
Secrets must not appear in Stremio manifest URLs or configuration exports by default.

See `AGENTS.md` sections 23 and 30.

## Reporting

Report security issues privately to the maintainers. Do not open a public issue with secret values.
