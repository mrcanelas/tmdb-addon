import type { RuleSet } from '@metalayer/config';
import type { ProviderCapabilities } from '@metalayer/providers';

export interface UnsupportedRuleWarning {
  rule: string;
  provider: string;
  reason: string;
  fallback?: string;
}

/**
 * Declare which RuleSet keys a provider can enforce server-side.
 * Unsupported keys still evaluate client-side after fetch when possible.
 */
export function checkProviderRuleSupport(
  rules: RuleSet,
  providerId: string,
  capabilities: ProviderCapabilities,
): UnsupportedRuleWarning[] {
  const warnings: UnsupportedRuleWarning[] = [];

  const push = (rule: string, reason: string, fallback?: string) => {
    warnings.push({ rule, provider: providerId, reason, fallback });
  };

  if (rules.digitallyReleasedOnly && !capabilities.supportsDigitalRelease) {
    push(
      'digitallyReleasedOnly',
      'Provider does not expose digital-release filtering',
      'post-filter after fetch',
    );
  }

  if (rules.maximumCertification && !capabilities.supportsAgeRating) {
    push(
      'maximumCertification',
      'Provider does not expose certification filtering',
      'post-filter after fetch',
    );
  }

  if (rules.availableInRegion && !capabilities.supportsRegion) {
    push(
      'availableInRegion',
      'Provider does not support region-aware catalogs',
      'ignore region constraint at provider boundary',
    );
  }

  if (
    (rules.originalLanguages?.length || rules.includeGenres?.length) &&
    !capabilities.supportsLanguage &&
    rules.originalLanguages?.length
  ) {
    push(
      'originalLanguages',
      'Provider language support is limited',
      'post-filter after fetch',
    );
  }

  if (rules.hideWatched && !capabilities.supportsTracking) {
    push(
      'hideWatched',
      'Provider has no tracking capability',
      'requires tracking integration',
    );
  }

  return warnings;
}
