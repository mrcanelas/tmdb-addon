import type {
  CatalogDefinition,
  MetaLayerConfig,
  RuleSet,
} from '@metalayer/config';
import {
  evaluateRules,
  resolveEffectiveRules,
  type RuleCandidate,
} from '@metalayer/rules';
import type { CatalogMetaPreview } from './merge.js';

export function catalogMetaToRuleCandidate(
  meta: CatalogMetaPreview,
): RuleCandidate {
  return {
    id: meta.id,
    type: meta.type,
    title: meta.name,
    overview: meta.overview,
    genres: meta.genres,
    keywords: meta.keywords,
    rating: meta.rating,
    voteCount: meta.voteCount,
    year: meta.year,
    adult: meta.adult,
    certification: meta.certification,
    released: meta.released,
    digitallyReleased: meta.digitallyReleased,
    originalLanguage: meta.originalLanguage,
    hasArtwork: meta.hasArtwork ?? Boolean(meta.poster),
  };
}

export function resolveCatalogEffectiveRules(
  config: MetaLayerConfig,
  catalog: CatalogDefinition,
): RuleSet {
  return resolveEffectiveRules({
    global: config.globalRules,
    catalog: catalog.rules,
  });
}

/**
 * Apply effective global + catalog rules to a resolved meta page.
 * Items missing rule-relevant fields pass checks that require those fields.
 */
export function filterMetasByEffectiveRules(
  metas: CatalogMetaPreview[],
  config: MetaLayerConfig,
  catalog: CatalogDefinition,
): CatalogMetaPreview[] {
  const rules = resolveCatalogEffectiveRules(config, catalog);
  if (Object.keys(rules).length === 0) return metas;
  return metas.filter(
    (meta) => evaluateRules(catalogMetaToRuleCandidate(meta), rules).include,
  );
}
