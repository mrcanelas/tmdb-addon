import { describe, expect, it } from 'vitest';
import {
  BoundedLogBuffer,
  MetricsRegistry,
  buildHealthSnapshot,
  buildSafeBackup,
  resolveDeploymentMode,
  safeTokenEquals,
} from './index.js';

describe('@metalayer/observability', () => {
  it('tracks metrics and builds health snapshots', () => {
    const metrics = new MetricsRegistry();
    metrics.increment('requestsTotal', 10);
    metrics.increment('errorsTotal', 1);
    metrics.increment('cacheHits', 8);
    metrics.increment('cacheMisses', 2);
    metrics.recordLatency(12);
    metrics.recordLatency(20);

    const health = buildHealthSnapshot({
      metrics,
      version: '1.0.0-alpha.1',
      startedAt: new Date(Date.now() - 5000),
      activeConfigurations: 2,
      env: {
        METALAYER_DEPLOYMENT_MODE: 'lite',
        METALAYER_SQLITE_PATH: './data/metalayer.sqlite',
        METALAYER_TELEMETRY_ENABLED: 'false',
      },
    });

    expect(health.status).toBe('ok');
    expect(health.mode).toBe('lite');
    expect(health.metrics.cacheHitRate).toBeCloseTo(0.8);
    expect(health.metrics.requestLatencyMs.samples).toBe(2);
    expect(health.database.kind).toBe('sqlite');
  });

  it('bounds and redacts log context', () => {
    const logs = new BoundedLogBuffer(2);
    logs.append({
      level: 'info',
      message: 'a',
      context: { apiKey: 'secret-value', ok: true },
    });
    logs.append({ level: 'warn', message: 'b' });
    logs.append({ level: 'error', message: 'c', correlationId: 'cid-1' });
    const listed = logs.list({ limit: 10 });
    expect(listed).toHaveLength(2);
    expect(listed[0]!.message).toBe('c');
    const withSecret = logs.list({ limit: 10 }).find((entry) => entry.message === 'b');
    // oldest dropped; ensure redaction on remaining older entry if present
    void withSecret;
    const first = new BoundedLogBuffer(5);
    const entry = first.append({
      level: 'info',
      message: 'x',
      context: { apiKey: 'secret-value' },
    });
    expect(JSON.stringify(entry.context)).not.toContain('secret-value');
  });

  it('compares dashboard tokens safely and builds secret-free backups', () => {
    expect(safeTokenEquals('abc', 'abc')).toBe(true);
    expect(safeTokenEquals('abc', 'abd')).toBe(false);
    expect(resolveDeploymentMode({ REDIS_URL: 'redis://x' })).toBe('server');

    const backup = buildSafeBackup({
      version: '1.0.0-alpha.1',
      mode: 'lite',
      configurations: [{ configId: 'x' }],
    });
    expect(backup.includesSecrets).toBe(false);
    expect(backup.notes.some((note) => note.includes('ENCRYPTION_KEY'))).toBe(true);
  });
});
