import type { LatencyBucket, MetricCounters } from './types.js';

const EMPTY: MetricCounters = {
  requestsTotal: 0,
  errorsTotal: 0,
  configReads: 0,
  configWrites: 0,
  providerFailures: 0,
  cacheHits: 0,
  cacheMisses: 0,
};

export class MetricsRegistry {
  private counters: MetricCounters = { ...EMPTY };
  private latency: LatencyBucket = { count: 0, totalMs: 0, maxMs: 0 };

  increment(counter: keyof MetricCounters, by = 1): void {
    this.counters[counter] += by;
  }

  recordLatency(ms: number): void {
    this.latency.count += 1;
    this.latency.totalMs += Math.max(0, ms);
    this.latency.maxMs = Math.max(this.latency.maxMs, ms);
  }

  snapshot(): MetricCounters & {
    requestLatencyMs: { avg: number; max: number; samples: number };
    cacheHitRate: number | null;
  } {
    const samples = this.latency.count;
    const hits = this.counters.cacheHits;
    const misses = this.counters.cacheMisses;
    const totalCache = hits + misses;
    return {
      ...this.counters,
      requestLatencyMs: {
        avg: samples === 0 ? 0 : this.latency.totalMs / samples,
        max: this.latency.maxMs,
        samples,
      },
      cacheHitRate: totalCache === 0 ? null : hits / totalCache,
    };
  }

  reset(): void {
    this.counters = { ...EMPTY };
    this.latency = { count: 0, totalMs: 0, maxMs: 0 };
  }
}
