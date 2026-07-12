import { config as loadEnv } from 'dotenv';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomBytes } from 'node:crypto';
import { buildApp } from './app.js';

const here = dirname(fileURLToPath(import.meta.url));
const packageRoot = resolve(here, '..');
const monorepoRoot = resolve(packageRoot, '../..');

for (const envPath of [
  resolve(process.cwd(), '.env'),
  resolve(packageRoot, '.env'),
  resolve(monorepoRoot, '.env'),
]) {
  if (existsSync(envPath)) {
    loadEnv({ path: envPath, override: false });
  }
}

function resolveDevEncryptionKey(): string {
  const configured = process.env.METALAYER_ENCRYPTION_KEY?.trim();
  if (configured) return configured;

  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      'METALAYER_ENCRYPTION_KEY is required in production. Set a 32-byte base64 or hex key.',
    );
  }

  const dataDir = resolve(monorepoRoot, 'data');
  const keyPath = resolve(dataDir, '.metalayer-dev-encryption-key');
  mkdirSync(dataDir, { recursive: true });

  if (existsSync(keyPath)) {
    const existing = readFileSync(keyPath, 'utf8').trim();
    if (existing) {
      process.env.METALAYER_ENCRYPTION_KEY = existing;
      return existing;
    }
  }

  const generated = randomBytes(32).toString('base64');
  writeFileSync(keyPath, `${generated}\n`, { encoding: 'utf8', mode: 0o600 });
  process.env.METALAYER_ENCRYPTION_KEY = generated;
  console.warn(
    '[metalayer-api] METALAYER_ENCRYPTION_KEY missing — using durable local key at data/.metalayer-dev-encryption-key (dev only). Copy it into .env for an explicit setup.',
  );
  return generated;
}

resolveDevEncryptionKey();

if (!process.env.METALAYER_SQLITE_PATH) {
  process.env.METALAYER_SQLITE_PATH = resolve(monorepoRoot, 'data', 'metalayer.sqlite');
}

const port = Number(process.env.METALAYER_API_PORT ?? 1338);
const host = process.env.METALAYER_API_HOST ?? '0.0.0.0';

const app = await buildApp();

try {
  await app.listen({ port, host });
  app.log.info(`MetaLayer API listening on http://${host}:${port}`);
} catch (error) {
  app.log.error(error);
  process.exit(1);
}
