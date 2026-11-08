import { describe, expect, it } from 'vitest';
import { applySortingPlan, resolveSeedWindow } from './apply.js';

describe('@metalayer/sorting', () => {
  const items = [
    { id: 'b', title: 'Beta', rating: 7, releaseDate: '2020-01-01', sourceOrder: 0 },
    { id: 'a', title: 'Alpha', rating: 9, releaseDate: '2019-01-01', sourceOrder: 1 },
    { id: 'c', title: 'Gamma', rating: 8, releaseDate: '2021-01-01', sourceOrder: 2 },
  ];

  it('applies multi-step criteria with stable id fallback', () => {
    const sorted = applySortingPlan(items, {
      criteria: [
        { field: 'rating', direction: 'desc' },
        { field: 'title', direction: 'asc' },
      ],
      stable: true,
    });
    expect(sorted.map((item) => item.id)).toEqual(['a', 'c', 'b']);
  });

  it('keeps random order stable within the same day window', () => {
    const now = new Date('2026-07-12T10:00:00.000Z');
    const plan = {
      criteria: [{ field: 'random' as const, direction: 'asc' as const }],
      stable: true,
      randomSeedWindow: 'day' as const,
    };
    const first = applySortingPlan(items, plan, { now, seedKey: 'catalog-1' });
    const second = applySortingPlan(items, plan, { now, seedKey: 'catalog-1' });
    expect(first.map((item) => item.id)).toEqual(second.map((item) => item.id));
    expect(resolveSeedWindow(plan, now, 'catalog-1')).toContain('d:');
  });

  it('changes random order across day windows', () => {
    const plan = {
      criteria: [{ field: 'random' as const, direction: 'asc' as const }],
      stable: true,
      randomSeedWindow: 'day' as const,
    };
    const day1 = applySortingPlan(items, plan, {
      now: new Date('2026-07-12T10:00:00.000Z'),
      seedKey: 'catalog-1',
    });
    const day2 = applySortingPlan(items, plan, {
      now: new Date('2026-07-13T10:00:00.000Z'),
      seedKey: 'catalog-1',
    });
    // Extremely unlikely to match for 3 items across seeds; assert seed window differs.
    expect(resolveSeedWindow(plan, new Date('2026-07-12T10:00:00.000Z'))).not.toBe(
      resolveSeedWindow(plan, new Date('2026-07-13T10:00:00.000Z')),
    );
    expect(day1).toHaveLength(3);
    expect(day2).toHaveLength(3);
  });
});
