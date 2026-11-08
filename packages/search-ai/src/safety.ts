import type { SanitizeAiContextInput } from './types.js';

const SECRET_KEY_RE =
  /(api[_-]?key|token|secret|password|credential|authorization|bearer)/i;
const SECRET_VALUE_RE =
  /\b(sk-[a-zA-Z0-9]{10,}|Bearer\s+[A-Za-z0-9._-]{10,}|[a-f0-9]{32,})\b/g;

/**
 * Strip secrets and private config before any AI provider call (AGENTS.md §16.5).
 */
export function sanitizeAiContext(input: SanitizeAiContextInput): {
  prompt: string;
  redactedKeys: string[];
} {
  const redactedKeys: string[] = [];
  let prompt = input.prompt;

  if (input.secrets) {
    for (const [key, value] of Object.entries(input.secrets)) {
      if (!value) continue;
      redactedKeys.push(key);
      if (prompt.includes(value)) {
        prompt = prompt.split(value).join('[REDACTED]');
      }
    }
  }

  prompt = prompt.replace(SECRET_VALUE_RE, '[REDACTED]');

  if (input.configSnippet && typeof input.configSnippet === 'object') {
    const walk = (value: unknown, path: string) => {
      if (typeof value === 'string') {
        if (SECRET_KEY_RE.test(path) || SECRET_VALUE_RE.test(value)) {
          redactedKeys.push(path);
        }
        return;
      }
      if (value && typeof value === 'object') {
        for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
          walk(nested, path ? `${path}.${key}` : key);
        }
      }
    };
    walk(input.configSnippet, '');
  }

  return { prompt: prompt.trim(), redactedKeys: [...new Set(redactedKeys)] };
}

/** AI must never auto-apply — require explicit confirm flag. */
export function assertProposalConfirmation(confirm: unknown): void {
  if (confirm !== true) {
    throw new ProposalConfirmationRequiredError();
  }
}

export class ProposalConfirmationRequiredError extends Error {
  constructor() {
    super('AI proposals require explicit confirm: true');
    this.name = 'ProposalConfirmationRequiredError';
  }
}
