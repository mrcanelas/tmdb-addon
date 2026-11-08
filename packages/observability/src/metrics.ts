import type { LatencyBucket, MetricCounters } from './types.js';
import { summarizeLatency, type LatencyPercentiles } from './percentile.js';

const EMPTY: MetricCounters = {
  requestsTotal: 0,
  errorsTotal: 0,
  configReads: 0,
  configWrites: 0,
  providerFailures: 0,
  cacheHits: 0,
  cacheMisses: 0,
};

const DEFAULT_SAMPLE_CAP = 1024;

export class MetricsRegistry {
  private counters: MetricCounters = { ...EMPTY };
  private latency: LatencyBucket = { count: 0, totalMs: 0, maxMs: 0 };
  private samples: number[] = [];
  private readonly sampleCap: number;

  constructor(options?: { sampleCap?: number }) {
    this.sampleCap = options?.sampleCap ?? DEFAULT_SAMPLE_CAP;
  }

  increment(counter: keyof MetricCounters, by = 1): void {
    this.counters[counter] += by;
  }

  recordLatency(ms: number): void {
    const value = Math.max(0, ms);
    this.latency.count += 1;
    this.latency.totalMs += value;
    this.latency.maxMs = Math.max(this.latency.maxMs, value);
    if (this.samples.length >= this.sampleCap) {
      this.samples.shift();
    }
    this.samples.push(value);
  }

  snapshot(): MetricCounters & {
    requestLatencyMs: LatencyPercentiles;
    cacheHitRate: number | null;
  } {
    const hits = this.counters.cacheHits;
    const misses = this.counters.cacheMisses;
    const totalCache = hits + misses;
    const percentiles = summarizeLatency(this.samples);
    return {
      ...this.counters,
      requestLatencyMs: {
        ...percentiles,
        // Keep count aligned with lifetime latency samples even if ring dropped early ones.
        samples: this.latency.count,
        avg:
          this.latency.count === 0
            ? 0
            : this.latency.totalMs / this.latency.count,
        max: this.latency.maxMs,
      },
      cacheHitRate: totalCache === 0 ? null : hits / totalCache,
    };
  }

  reset(): void {
    this.counters = { ...EMPTY };
    this.latency = { count: 0, totalMs: 0, maxMs: 0 };
    this.samples = [];
  }
}
