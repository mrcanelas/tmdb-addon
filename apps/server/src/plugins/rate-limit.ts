import type { FastifyInstance, FastifyPluginAsync } from 'fastify';
import fp from 'fastify-plugin';

export interface RateLimitOptions {
  /** Max requests per window per IP. Default from env or 120. */
  max?: number;
  /** Window length in ms. Default from env or 60_000. */
  timeWindowMs?: number;
  /** Paths that skip rate limiting (health, static SPA prefixes). */
  skipPathPrefixes?: string[];
}

interface Bucket {
  count: number;
  resetAt: number;
}

/**
 * Lightweight in-process rate limiter for public Stremio + management APIs.
 * Fastify resolves client addresses through explicitly trusted proxies.
 */
const rateLimitPluginImpl: FastifyPluginAsync<RateLimitOptions> = async (
  app: FastifyInstance,
  options,
) => {
  const skip = options.skipPathPrefixes ?? [
    '/configure',
    '/api/v1/health',
  ];
  const buckets = new Map<string, Bucket>();
  const maxKey = 'METALAYER_RATE_LIMIT_MAX';
  const windowKey = 'METALAYER_RATE_LIMIT_WINDOW_MS';
  const resetWindow = app.runtimeSettings.subscribe(windowKey, () => buckets.clear());
  const positive = (value: number | undefined, fallback: number) =>
    value !== undefined && Number.isSafeInteger(value) && value > 0 ? value : fallback;

  app.addHook('onRequest', async (request, reply) => {
    const path = request.url.split('?')[0] ?? request.url;
    if (skip.some((prefix) => path === prefix || path.startsWith(`${prefix}/`))) {
      return;
    }
    const max = options.max ?? positive(app.runtimeSettings.getNumber(maxKey), 120);
    const timeWindowMs = options.timeWindowMs ?? positive(app.runtimeSettings.getNumber(windowKey), 60_000);
    const key = request.ip;
    const now = Date.now();
    let bucket = buckets.get(key);
    if (!bucket || bucket.resetAt <= now) {
      bucket = { count: 0, resetAt: now + timeWindowMs };
      buckets.set(key, bucket);
    }
    bucket.count += 1;
    reply.header('x-ratelimit-limit', String(max));
    reply.header('x-ratelimit-remaining', String(Math.max(0, max - bucket.count)));
    reply.header('x-ratelimit-reset', String(Math.ceil(bucket.resetAt / 1000)));
    if (bucket.count > max) {
      return reply.status(429).send({
        code: 'RATE_LIMITED',
        message: 'Too many requests',
        correlationId: request.correlationId,
      });
    }
  });

  // Bound map growth in long-running processes.
  const janitor = setInterval(() => {
    const now = Date.now();
    for (const [key, bucket] of buckets) {
      if (bucket.resetAt <= now) buckets.delete(key);
    }
  }, 30_000);
  janitor.unref?.();
  app.addHook('onClose', async () => {
    clearInterval(janitor);
    resetWindow();
  });
};

export const rateLimitPlugin = fp(rateLimitPluginImpl, {
  name: 'metalayer-rate-limit',
});
