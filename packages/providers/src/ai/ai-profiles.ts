export interface AiServiceProfile {
  id: string;
  /** Build the URL used by Sources diagnostics `ping`. */
  pingUrl: (apiKey: string) => string;
  pingHeaders: (apiKey: string) => Record<string, string>;
  /** Optional extra validation after a 2xx response. */
  validatePingBody?: (body: unknown) => boolean;
}

export const AI_SERVICE_PROFILES = {
  gemini: {
    id: 'gemini',
    pingUrl: (apiKey) =>
      `https://generativelanguage.googleapis.com/v1/models?key=${encodeURIComponent(apiKey)}`,
    pingHeaders: () => ({}),
    validatePingBody: (body) => {
      if (!body || typeof body !== 'object') return false;
      const record = body as { models?: unknown; error?: unknown };
      return Array.isArray(record.models) && !record.error;
    },
  },
  groq: {
    id: 'groq',
    pingUrl: () => 'https://api.groq.com/openai/v1/models',
    pingHeaders: (apiKey) => ({
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    }),
    validatePingBody: (body) => {
      if (!body || typeof body !== 'object') return false;
      const record = body as { data?: unknown; error?: unknown };
      return Array.isArray(record.data) && !record.error;
    },
  },
  openrouter: {
    id: 'openrouter',
    // Public /models returns 200 even for invalid keys — use auth/key instead.
    pingUrl: () => 'https://openrouter.ai/api/v1/auth/key',
    pingHeaders: (apiKey) => ({
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    }),
    validatePingBody: (body) => {
      if (!body || typeof body !== 'object') return false;
      const record = body as { data?: unknown; error?: unknown };
      return record.data !== undefined && !record.error;
    },
  },
} as const satisfies Record<string, AiServiceProfile>;

export type AiProviderId = keyof typeof AI_SERVICE_PROFILES;

export const OPENAI_COMPATIBLE_CHAT_PROFILES = {
  groq: {
    id: 'groq',
    chatCompletionsUrl: 'https://api.groq.com/openai/v1/chat/completions',
    primaryModel: 'llama-3.3-70b-versatile',
    fallbackModel: 'llama-3.1-8b-instant',
    temperature: 0.2,
    timeoutMs: 10_000,
  },
  openrouter: {
    id: 'openrouter',
    chatCompletionsUrl: 'https://openrouter.ai/api/v1/chat/completions',
    primaryModel: 'meta-llama/llama-3.3-70b-instruct:free',
    fallbackModel: 'google/gemma-2-9b-it:free',
    temperature: 0.2,
    timeoutMs: 15_000,
  },
} as const;
