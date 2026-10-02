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

function clientKey(request: { ip: string; headers: Record<string, unknown> }): string {
  const forwarded = request.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.trim()) {
    return forwarded.split(',')[0]!.trim();
  }
  return request.ip || 'unknown';
}

/**
 * Lightweight in-process rate limiter for public Stremio + management APIs.
 * Limits are overridable via METALAYER_RATE_LIMIT_MAX / _WINDOW_MS (W5 settings).
 */
const rateLimitPluginImpl: FastifyPluginAsync<RateLimitOptions> = async (
  app: FastifyInstance,
  options,
) => {
  const max =
    options.max ??
    (Number(process.env.METALAYER_RATE_LIMIT_MAX ?? 120) || 120);
  const timeWindowMs =
    options.timeWindowMs ??
    (Number(process.env.METALAYER_RATE_LIMIT_WINDOW_MS ?? 60_000) || 60_000);
  const skip = options.skipPathPrefixes ?? [
    '/configure',
    '/admin',
    '/health',
    '/dashboard/health',
  ];
  const buckets = new Map<string, Bucket>();

  app.addHook('onRequest', async (request, reply) => {
    const path = request.url.split('?')[0] ?? request.url;
    if (skip.some((prefix) => path === prefix || path.startsWith(`${prefix}/`))) {
      return;
    }
    const key = clientKey(request);
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
  }, Math.max(30_000, timeWindowMs));
  janitor.unref?.();
  app.addHook('onClose', async () => {
    clearInterval(janitor);
  });
};

export const rateLimitPlugin = fp(rateLimitPluginImpl, {
  name: 'metalayer-rate-limit',
});
