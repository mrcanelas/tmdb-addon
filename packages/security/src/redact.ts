const REDACTED = '[REDACTED]';

const SENSITIVE_KEY =
  /^(editCredential|edit_credential|password|passwd|secret|secrets|apiKey|api_key|accessToken|access_token|refreshToken|refresh_token|token|authorization|ciphertext|encryptionKey|encryption_key|plaintext|client_secret|clientSecret)$/i;

const SENSITIVE_HEADER =
  /^(authorization|cookie|set-cookie|x-metalayer-edit-credential)$/i;

/** Vault envelope or long opaque credential-looking strings. */
const VAULT_ENVELOPE = /^v1:\d+:[A-Za-z0-9_-]+:[A-Za-z0-9_-]+:[A-Za-z0-9_-]+$/;
const LONG_OPAQUE = /^[A-Za-z0-9+/=_-]{48,}$/;

export function isSensitiveKey(key: string): boolean {
  return SENSITIVE_KEY.test(key);
}

export function isSensitiveHeader(name: string): boolean {
  return SENSITIVE_HEADER.test(name);
}

function redactString(value: string): string {
  if (VAULT_ENVELOPE.test(value) || LONG_OPAQUE.test(value)) {
    return REDACTED;
  }
  return value;
}

/**
 * Deep-clone and redact credentials, vault payloads, and sensitive headers
 * so they never appear in operator logs (`AGENTS.md` §23.6).
 */
export function redactSensitive(value: unknown, seen = new WeakSet<object>()): unknown {
  if (value === null || value === undefined) return value;

  if (typeof value === 'string') {
    return redactString(value);
  }

  if (typeof value !== 'object') {
    return value;
  }

  if (seen.has(value as object)) {
    return '[Circular]';
  }
  seen.add(value as object);

  if (Array.isArray(value)) {
    return value.map((item) => redactSensitive(item, seen));
  }

  if (value instanceof Error) {
    return {
      name: value.name,
      message: redactString(value.message),
      stack: value.stack ? redactString(value.stack) : undefined,
    };
  }

  const input = value as Record<string, unknown>;
  const output: Record<string, unknown> = {};

  for (const [key, nested] of Object.entries(input)) {
    if (isSensitiveKey(key) || isSensitiveHeader(key)) {
      if (nested && typeof nested === 'object' && !Array.isArray(nested)) {
        const nestedObj = nested as Record<string, unknown>;
        const redactedNested: Record<string, unknown> = {};
        for (const nestedKey of Object.keys(nestedObj)) {
          redactedNested[nestedKey] = REDACTED;
        }
        output[key] = redactedNested;
      } else {
        output[key] = REDACTED;
      }
      continue;
    }
    output[key] = redactSensitive(nested, seen);
  }

  return output;
}

/** Pino/Fastify redact paths for common request shapes. */
export const FASTIFY_LOG_REDACT_PATHS = [
  'req.headers.authorization',
  'req.headers.cookie',
  'req.headers["x-metalayer-edit-credential"]',
  'req.body.editCredential',
  'req.body.secrets',
  'req.body.secrets.*',
  'body.editCredential',
  'body.secrets',
  'body.secrets.*',
] as const;
