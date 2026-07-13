/**
 * Nearest-rank percentile over a copy of samples (ascending).
 * `percentile` is in 0–100 (e.g. 95 for p95).
 */
export function computePercentile(samples: number[], percentile: number): number {
  if (samples.length === 0) return 0;
  if (percentile <= 0) return Math.min(...samples);
  if (percentile >= 100) return Math.max(...samples);

  const sorted = [...samples].sort((a, b) => a - b);
  const rank = Math.ceil((percentile / 100) * sorted.length) - 1;
  const index = Math.min(sorted.length - 1, Math.max(0, rank));
  return sorted[index]!;
}

export interface LatencyPercentiles {
  avg: number;
  max: number;
  p50: number;
  p95: number;
  p99: number;
  samples: number;
}

export function summarizeLatency(samples: number[]): LatencyPercentiles {
  if (samples.length === 0) {
    return { avg: 0, max: 0, p50: 0, p95: 0, p99: 0, samples: 0 };
  }
  const total = samples.reduce((sum, value) => sum + value, 0);
  return {
    avg: total / samples.length,
    max: Math.max(...samples),
    p50: computePercentile(samples, 50),
    p95: computePercentile(samples, 95),
    p99: computePercentile(samples, 99),
    samples: samples.length,
  };
}
