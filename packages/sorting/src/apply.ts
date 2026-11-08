import type { SortingPlan } from '@metalayer/config';

export interface SortableItem {
  id: string;
  title?: string;
  originalTitle?: string;
  rating?: number;
  voteCount?: number;
  releaseDate?: string;
  popularity?: number;
  runtime?: number;
  sourceOrder?: number;
}

export interface ApplySortingOptions {
  now?: Date;
  /** Extra entropy for request-scoped or profile-scoped seeds. */
  seedKey?: string;
}

function hashSeed(input: string): number {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function windowBucket(
  window: NonNullable<SortingPlan['randomSeedWindow']>,
  now: Date,
): string {
  const utcDay = Math.floor(now.getTime() / 86_400_000);
  switch (window) {
    case 'hour':
      return `h:${utcDay * 24 + now.getUTCHours()}`;
    case 'day':
      return `d:${utcDay}`;
    case 'week':
      return `w:${Math.floor(utcDay / 7)}`;
    case 'request':
    default:
      return `r:${now.getTime()}`;
  }
}

function mulberry32(seed: number): () => number {
  let t = seed;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

function compareNullable(
  a: number | string | undefined,
  b: number | string | undefined,
  direction: 'asc' | 'desc',
): number {
  if (a === undefined && b === undefined) return 0;
  if (a === undefined) return 1;
  if (b === undefined) return -1;
  if (a === b) return 0;
  const result = a < b ? -1 : 1;
  return direction === 'asc' ? result : -result;
}

/**
 * Apply a multi-step SortingPlan. When stable, ties fall back to id.
 * Random uses a deterministic seed for the configured time window.
 */
export function applySortingPlan<T extends SortableItem>(
  items: T[],
  plan: SortingPlan,
  options: ApplySortingOptions = {},
): T[] {
  const now = options.now ?? new Date();
  const seedKey = options.seedKey ?? 'default';
  const criteria = plan.criteria.length > 0 ? plan.criteria : [{ field: 'sourceOrder' as const, direction: 'asc' as const }];

  const randomCriterion = criteria.find((item) => item.field === 'random');
  const randomScores = new Map<string, number>();
  if (randomCriterion) {
    const window = plan.randomSeedWindow ?? 'day';
    const seed = hashSeed(`${seedKey}:${windowBucket(window, now)}`);
    const rand = mulberry32(seed);
    for (const item of items) {
      randomScores.set(item.id, rand());
    }
  }

  const decorated = items.map((item, index) => ({
    item,
    sourceOrder: item.sourceOrder ?? index,
  }));

  decorated.sort((left, right) => {
    for (const criterion of criteria) {
      let cmp = 0;
      switch (criterion.field) {
        case 'sourceOrder':
          cmp = compareNullable(left.sourceOrder, right.sourceOrder, criterion.direction);
          break;
        case 'title':
          cmp = compareNullable(
            left.item.title?.toLowerCase(),
            right.item.title?.toLowerCase(),
            criterion.direction,
          );
          break;
        case 'originalTitle':
          cmp = compareNullable(
            left.item.originalTitle?.toLowerCase(),
            right.item.originalTitle?.toLowerCase(),
            criterion.direction,
          );
          break;
        case 'rating':
          cmp = compareNullable(left.item.rating, right.item.rating, criterion.direction);
          break;
        case 'voteCount':
          cmp = compareNullable(left.item.voteCount, right.item.voteCount, criterion.direction);
          break;
        case 'releaseDate':
          cmp = compareNullable(left.item.releaseDate, right.item.releaseDate, criterion.direction);
          break;
        case 'popularity':
          cmp = compareNullable(left.item.popularity, right.item.popularity, criterion.direction);
          break;
        case 'runtime':
          cmp = compareNullable(left.item.runtime, right.item.runtime, criterion.direction);
          break;
        case 'random':
          cmp = compareNullable(
            randomScores.get(left.item.id),
            randomScores.get(right.item.id),
            criterion.direction,
          );
          break;
        default:
          cmp = 0;
      }
      if (cmp !== 0) return cmp;
    }

    if (plan.stable) {
      return left.item.id.localeCompare(right.item.id);
    }
    return 0;
  });

  return decorated.map((entry) => entry.item);
}

export function resolveSeedWindow(
  plan: SortingPlan,
  now: Date = new Date(),
  seedKey = 'default',
): string {
  const window = plan.randomSeedWindow ?? 'day';
  return `${seedKey}:${windowBucket(window, now)}`;
}
