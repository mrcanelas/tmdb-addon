import { describe, expect, it } from 'vitest';
import { ProviderHealthRegistry } from './health-registry.js';

describe('ProviderHealthRegistry', () => {
  it('reuses the same tracker across getOrCreate calls', () => {
    const registry = new ProviderHealthRegistry({
      circuitFailureThreshold: 2,
      circuitOpenMs: 60_000,
    });

    const first = registry.getOrCreate('tmdb');
    const second = registry.getOrCreate('tmdb');
    expect(second).toBe(first);

    first.recordFailure('upstream');
    first.recordFailure('upstream');
    expect(registry.snapshot('tmdb')?.state).toBe('open');
    expect(registry.snapshotAll().tmdb.state).toBe('open');
  });

  it('reset clears one provider or the whole registry', () => {
    const registry = new ProviderHealthRegistry();
    registry.getOrCreate('tmdb').recordFailure('network');
    registry.getOrCreate('fanart').recordFailure('network');

    registry.reset('tmdb');
    expect(registry.get('tmdb')).toBeUndefined();
    expect(registry.get('fanart')).toBeDefined();

    registry.reset();
    expect(registry.snapshotAll()).toEqual({});
  });
});
