import { RuleSetSchema, type RuleSet } from '@metalayer/config';
import type { DiscoveryPlan, DiscoverySortCriterion, MediaType } from './types.js';

const GENRE_ALIASES: Record<string, string> = {
  investigation: 'Mystery',
  mystery: 'Mystery',
  crime: 'Crime',
  horror: 'Horror',
  scifi: 'Science Fiction',
  'science fiction': 'Science Fiction',
  'sci-fi': 'Science Fiction',
  action: 'Action',
  comedy: 'Comedy',
  drama: 'Drama',
  anime: 'Animation',
  thriller: 'Thriller',
};

function detectMediaType(prompt: string): MediaType {
  const lower = prompt.toLowerCase();
  if (/\banime\b/.test(lower)) return 'anime';
  if (/\b(series|tv shows?|television)\b/.test(lower)) return 'series';
  return 'movie';
}

function extractGenres(prompt: string): {
  include: string[];
  exclude: string[];
} {
  const lower = prompt.toLowerCase();
  const exclude: string[] = [];
  const include: string[] = [];

  const withoutMatch = lower.match(
    /without\s+([a-z][a-z\s-]{0,40}?)(?:\s+and\b|,|\.|$)/,
  );
  if (withoutMatch?.[1]) {
    const key = withoutMatch[1].trim();
    const genre = GENRE_ALIASES[key] ?? capitalize(key);
    exclude.push(genre);
  }

  for (const [alias, genre] of Object.entries(GENRE_ALIASES)) {
    if (alias === 'horror' && exclude.includes('Horror')) continue;
    if (new RegExp(`\\b${alias}\\b`, 'i').test(lower) && !exclude.includes(genre)) {
      if (!include.includes(genre)) include.push(genre);
    }
  }

  // "Investigation movies" → Mystery + Crime when investigation present
  if (/\binvestigation\b/i.test(lower)) {
    for (const genre of ['Mystery', 'Crime']) {
      if (!include.includes(genre)) include.push(genre);
    }
  }

  return { include, exclude };
}

function extractRuntimeMax(prompt: string): number | undefined {
  const lower = prompt.toLowerCase();
  const hours = lower.match(/under\s+(\d+(?:\.\d+)?)\s+hours?/);
  if (hours?.[1]) return Math.round(Number(hours[1]) * 60);
  const minutes = lower.match(/under\s+(\d+)\s+min(?:utes)?/);
  if (minutes?.[1]) return Number(minutes[1]);
  const twoHours = /under two hours|less than two hours|under 2 hours/.test(lower);
  if (twoHours) return 120;
  return undefined;
}

function capitalize(value: string): string {
  return value.replace(/\b\w/g, (char) => char.toUpperCase());
}

/**
 * Deterministic heuristic Smart Discovery (fixture-safe, no network).
 * AI providers may refine via proposeDiscoveryPlan; result is always re-validated.
 */
export function parseDiscoveryPrompt(prompt: string): DiscoveryPlan {
  const mediaType = detectMediaType(prompt);
  const { include, exclude } = extractGenres(prompt);
  const runtimeMax = extractRuntimeMax(prompt);
  const assumptions: string[] = [];
  const warnings: string[] = [];

  if (include.length === 0 && exclude.length === 0) {
    assumptions.push('No genres detected; popularity sort only');
  }
  if (mediaType === 'movie' && /\bmovies?\b/i.test(prompt) === false) {
    assumptions.push('Defaulted media type to movie');
  }

  const sort: DiscoverySortCriterion[] = [
    { field: 'popularity', direction: 'desc' },
  ];

  return {
    mediaType,
    includeGenres: include.length ? include : undefined,
    excludeGenres: exclude.length ? exclude : undefined,
    runtimeMax,
    sort,
    rawPrompt: prompt.trim(),
    assumptions,
    warnings,
  };
}

export function discoveryPlanToRuleSet(plan: DiscoveryPlan): RuleSet {
  return RuleSetSchema.parse({
    includeGenres: plan.includeGenres,
    excludeGenres: plan.excludeGenres,
    requireGenres: plan.requireGenres,
    runtimeMax: plan.runtimeMax,
    runtimeMin: plan.runtimeMin,
    yearFrom: plan.yearFrom,
    yearTo: plan.yearTo,
    minimumRating: plan.minimumRating,
  });
}

export function validateDiscoveryPlan(input: unknown): {
  ok: boolean;
  plan?: DiscoveryPlan;
  issues: string[];
} {
  if (typeof input !== 'object' || input === null) {
    return { ok: false, issues: ['Discovery plan must be an object'] };
  }
  const record = input as Record<string, unknown>;
  const issues: string[] = [];

  const mediaType = record.mediaType;
  if (mediaType !== 'movie' && mediaType !== 'series' && mediaType !== 'anime') {
    issues.push('mediaType must be movie, series, or anime');
  }

  const sort = record.sort;
  if (!Array.isArray(sort) || sort.length === 0) {
    issues.push('sort must be a non-empty array');
  }

  if (typeof record.rawPrompt !== 'string' || !record.rawPrompt.trim()) {
    issues.push('rawPrompt is required');
  }

  // Rule fields must pass RuleSetSchema
  const rulesCheck = RuleSetSchema.safeParse({
    includeGenres: record.includeGenres,
    excludeGenres: record.excludeGenres,
    requireGenres: record.requireGenres,
    runtimeMax: record.runtimeMax,
    runtimeMin: record.runtimeMin,
    yearFrom: record.yearFrom,
    yearTo: record.yearTo,
    minimumRating: record.minimumRating,
  });
  if (!rulesCheck.success) {
    issues.push(...rulesCheck.error.issues.map((item) => item.message));
  }

  if (issues.length) return { ok: false, issues };

  return {
    ok: true,
    issues: [],
    plan: {
      mediaType: mediaType as MediaType,
      includeGenres: record.includeGenres as string[] | undefined,
      excludeGenres: record.excludeGenres as string[] | undefined,
      requireGenres: record.requireGenres as string[] | undefined,
      runtimeMax: record.runtimeMax as number | undefined,
      runtimeMin: record.runtimeMin as number | undefined,
      yearFrom: record.yearFrom as number | undefined,
      yearTo: record.yearTo as number | undefined,
      minimumRating: record.minimumRating as number | undefined,
      sort: sort as DiscoverySortCriterion[],
      rawPrompt: String(record.rawPrompt),
      assumptions: Array.isArray(record.assumptions)
        ? (record.assumptions as string[])
        : [],
      warnings: Array.isArray(record.warnings) ? (record.warnings as string[]) : [],
    },
  };
}
