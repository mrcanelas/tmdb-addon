import type { RuleSet } from '@metalayer/config';

/** Lightweight item shape for pure rule evaluation (provider-neutral). */
export interface RuleCandidate {
  id: string;
  type?: 'movie' | 'series' | 'anime';
  title?: string;
  genres?: string[];
  rating?: number;
  voteCount?: number;
  year?: number;
  runtime?: number;
  originalLanguage?: string;
  productionCountries?: string[];
  networks?: string[];
  adult?: boolean;
  certification?: string;
  released?: boolean;
  digitallyReleased?: boolean;
  availableInRegions?: string[];
  watched?: boolean;
  hasArtwork?: boolean;
  isSpecial?: boolean;
}

export interface RuleExplanation {
  rule: string;
  outcome: 'include' | 'exclude' | 'prefer';
  detail: string;
}

export interface RuleEvaluation {
  include: boolean;
  reasons: RuleExplanation[];
}

function hasAll(haystack: string[] | undefined, needles: string[]): boolean {
  if (!haystack || haystack.length === 0) return false;
  const set = new Set(haystack.map((item) => item.toLowerCase()));
  return needles.every((needle) => set.has(needle.toLowerCase()));
}

function hasAny(haystack: string[] | undefined, needles: string[]): boolean {
  if (!haystack || haystack.length === 0) return false;
  const set = new Set(haystack.map((item) => item.toLowerCase()));
  return needles.some((needle) => set.has(needle.toLowerCase()));
}

/**
 * Evaluate a single effective RuleSet against a candidate item.
 * Prefer/boost rules do not exclude; they only annotate.
 */
export function evaluateRules(
  item: RuleCandidate,
  rules: RuleSet,
): RuleEvaluation {
  const reasons: RuleExplanation[] = [];

  if (rules.excludeAdult && item.adult) {
    reasons.push({
      rule: 'excludeAdult',
      outcome: 'exclude',
      detail: 'Item is marked adult',
    });
    return { include: false, reasons };
  }

  if (rules.hideWatched && item.watched) {
    reasons.push({
      rule: 'hideWatched',
      outcome: 'exclude',
      detail: 'Item is watched',
    });
    return { include: false, reasons };
  }

  if (rules.hideSpecials && item.isSpecial) {
    reasons.push({
      rule: 'hideSpecials',
      outcome: 'exclude',
      detail: 'Item is a special',
    });
    return { include: false, reasons };
  }

  if (rules.requireArtwork && item.hasArtwork === false) {
    reasons.push({
      rule: 'requireArtwork',
      outcome: 'exclude',
      detail: 'Artwork is missing',
    });
    return { include: false, reasons };
  }

  if (rules.releasedOnly && item.released === false) {
    reasons.push({
      rule: 'releasedOnly',
      outcome: 'exclude',
      detail: 'Item is not released',
    });
    return { include: false, reasons };
  }

  if (rules.digitallyReleasedOnly && item.digitallyReleased === false) {
    reasons.push({
      rule: 'digitallyReleasedOnly',
      outcome: 'exclude',
      detail: 'Item is not digitally released',
    });
    return { include: false, reasons };
  }

  if (rules.availableInRegion) {
    const regions = item.availableInRegions ?? [];
    if (!regions.map((r) => r.toUpperCase()).includes(rules.availableInRegion.toUpperCase())) {
      reasons.push({
        rule: 'availableInRegion',
        outcome: 'exclude',
        detail: `Not available in ${rules.availableInRegion}`,
      });
      return { include: false, reasons };
    }
  }

  if (rules.excludeGenres?.length && hasAny(item.genres, rules.excludeGenres)) {
    reasons.push({
      rule: 'excludeGenres',
      outcome: 'exclude',
      detail: `Matches excluded genre(s): ${rules.excludeGenres.join(', ')}`,
    });
    return { include: false, reasons };
  }

  if (rules.requireGenres?.length && !hasAll(item.genres, rules.requireGenres)) {
    reasons.push({
      rule: 'requireGenres',
      outcome: 'exclude',
      detail: `Missing required genre(s): ${rules.requireGenres.join(', ')}`,
    });
    return { include: false, reasons };
  }

  if (rules.includeGenres?.length && !hasAny(item.genres, rules.includeGenres)) {
    reasons.push({
      rule: 'includeGenres',
      outcome: 'exclude',
      detail: `Outside include genre set: ${rules.includeGenres.join(', ')}`,
    });
    return { include: false, reasons };
  }

  if (rules.excludeNetworks?.length && hasAny(item.networks, rules.excludeNetworks)) {
    reasons.push({
      rule: 'excludeNetworks',
      outcome: 'exclude',
      detail: `Matches excluded network(s)`,
    });
    return { include: false, reasons };
  }

  if (rules.includeNetworks?.length && !hasAny(item.networks, rules.includeNetworks)) {
    reasons.push({
      rule: 'includeNetworks',
      outcome: 'exclude',
      detail: `Outside include network set`,
    });
    return { include: false, reasons };
  }

  if (
    rules.originalLanguages?.length &&
    item.originalLanguage &&
    !rules.originalLanguages
      .map((lang) => lang.toLowerCase())
      .includes(item.originalLanguage.toLowerCase())
  ) {
    reasons.push({
      rule: 'originalLanguages',
      outcome: 'exclude',
      detail: `Original language ${item.originalLanguage} not allowed`,
    });
    return { include: false, reasons };
  }

  if (
    rules.productionCountries?.length &&
    !hasAny(item.productionCountries, rules.productionCountries)
  ) {
    reasons.push({
      rule: 'productionCountries',
      outcome: 'exclude',
      detail: `Production country not in allow-list`,
    });
    return { include: false, reasons };
  }

  if (typeof rules.minimumRating === 'number' && typeof item.rating === 'number') {
    if (item.rating < rules.minimumRating) {
      reasons.push({
        rule: 'minimumRating',
        outcome: 'exclude',
        detail: `Rating ${item.rating} < ${rules.minimumRating}`,
      });
      return { include: false, reasons };
    }
  }

  if (typeof rules.minimumVotes === 'number' && typeof item.voteCount === 'number') {
    if (item.voteCount < rules.minimumVotes) {
      reasons.push({
        rule: 'minimumVotes',
        outcome: 'exclude',
        detail: `Votes ${item.voteCount} < ${rules.minimumVotes}`,
      });
      return { include: false, reasons };
    }
  }

  if (typeof rules.yearFrom === 'number' && typeof item.year === 'number') {
    if (item.year < rules.yearFrom) {
      reasons.push({
        rule: 'yearFrom',
        outcome: 'exclude',
        detail: `Year ${item.year} < ${rules.yearFrom}`,
      });
      return { include: false, reasons };
    }
  }

  if (typeof rules.yearTo === 'number' && typeof item.year === 'number') {
    if (item.year > rules.yearTo) {
      reasons.push({
        rule: 'yearTo',
        outcome: 'exclude',
        detail: `Year ${item.year} > ${rules.yearTo}`,
      });
      return { include: false, reasons };
    }
  }

  if (typeof rules.runtimeMin === 'number' && typeof item.runtime === 'number') {
    if (item.runtime < rules.runtimeMin) {
      reasons.push({
        rule: 'runtimeMin',
        outcome: 'exclude',
        detail: `Runtime ${item.runtime} < ${rules.runtimeMin}`,
      });
      return { include: false, reasons };
    }
  }

  if (typeof rules.runtimeMax === 'number' && typeof item.runtime === 'number') {
    if (item.runtime > rules.runtimeMax) {
      reasons.push({
        rule: 'runtimeMax',
        outcome: 'exclude',
        detail: `Runtime ${item.runtime} > ${rules.runtimeMax}`,
      });
      return { include: false, reasons };
    }
  }

  if (rules.maximumCertification && item.certification) {
    const order = ['G', 'PG', 'PG-13', 'R', 'NC-17', 'NR'];
    const maxIdx = order.indexOf(rules.maximumCertification.toUpperCase());
    const itemIdx = order.indexOf(item.certification.toUpperCase());
    if (maxIdx >= 0 && itemIdx > maxIdx) {
      reasons.push({
        rule: 'maximumCertification',
        outcome: 'exclude',
        detail: `Certification ${item.certification} exceeds ${rules.maximumCertification}`,
      });
      return { include: false, reasons };
    }
  }

  if (rules.preferGenres?.length && hasAny(item.genres, rules.preferGenres)) {
    reasons.push({
      rule: 'preferGenres',
      outcome: 'prefer',
      detail: `Matches preferred genre(s)`,
    });
  }

  reasons.push({
    rule: 'default',
    outcome: 'include',
    detail: 'Passed effective rule set',
  });
  return { include: true, reasons };
}
