import type { CatalogMetaPreview } from '@metalayer/catalogs';
import type { CatalogDefinition, MetaLayerConfig, RuleSet } from '@metalayer/config';
import { evaluateRules, resolveEffectiveRules, type RuleCandidate } from '@metalayer/rules';
import { applySortingPlan } from '@metalayer/sorting';

export type CatalogWarning = { code: string; params?: Record<string, unknown> };
const RULE_FIELDS: Partial<Record<keyof RuleSet, keyof RuleCandidate>> = {
  includeGenres: 'genres', requireGenres: 'genres', excludeGenres: 'genres', preferGenres: 'genres',
  minimumRating: 'rating', minimumVotes: 'voteCount', yearFrom: 'year', yearTo: 'year',
  runtimeMin: 'runtime', runtimeMax: 'runtime', originalLanguages: 'originalLanguage',
  productionCountries: 'productionCountries', includeNetworks: 'networks', excludeNetworks: 'networks',
  releasedOnly: 'released', digitallyReleasedOnly: 'digitallyReleased', availableInRegion: 'availableInRegions',
  excludeAdult: 'adult', maximumCertification: 'certification', hideWatched: 'watched',
  requireArtwork: 'hasArtwork', hideSpecials: 'isSpecial',
};

/** Lightweight page policy shared by Studio and Stremio; never N metadata calls per card. */
export function applyCatalogPolicy(
  metas: CatalogMetaPreview[], config: MetaLayerConfig, catalog: CatalogDefinition,
): { metas: CatalogMetaPreview[]; warnings: CatalogWarning[] } {
  const rules = resolveEffectiveRules({ global: config.globalRules, catalog: catalog.rules });
  const warnings = new Map<string, CatalogWarning>();
  const included = metas.map((meta, index) => ({
    ...meta, ...meta.facts, title: meta.name, releaseDate: meta.releaseInfo, sourceOrder: index,
  })).filter(meta => {
    const year = meta.releaseInfo ? Number(meta.releaseInfo.slice(0, 4)) : undefined;
    const item: RuleCandidate = { ...meta, year: Number.isFinite(year) ? year : undefined,
      hasArtwork: Boolean(meta.poster),
      released: meta.releaseInfo ? Date.parse(meta.releaseInfo) <= Date.now() : undefined };
    const supported = { ...rules };
    for (const [rule, field] of Object.entries(RULE_FIELDS)) {
      const value = rules[rule as keyof RuleSet];
      if (value === undefined || value === false || (Array.isArray(value) && !value.length)) continue;
      if (item[field as keyof RuleCandidate] === undefined) {
        delete supported[rule as keyof RuleSet];
        warnings.set(rule, { code: 'RULE_DATA_UNAVAILABLE', params: { rule, provider: meta.provider ?? catalog.provider } });
      }
    }
    return evaluateRules(item, supported).include;
  });
  const plan = catalog.sorting ?? config.globalSorting;
  if (plan) {
    for (const criterion of plan.criteria) {
      if (criterion.field !== 'random' && included.some(item => item[criterion.field as keyof typeof item] === undefined)) {
        warnings.set(`sort:${criterion.field}`, { code: 'SORT_DATA_UNAVAILABLE', params: { field: criterion.field } });
      }
    }
  }
  const sorted = plan ? applySortingPlan(included, plan, { seedKey: catalog.instanceId }) : included;
  return { metas: sorted, warnings: [...warnings.values()] };
}
