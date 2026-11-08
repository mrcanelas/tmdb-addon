import type { RuleSet } from '@metalayer/config';
import type { ProviderCapabilities } from '@metalayer/providers';

export interface UnsupportedRuleWarning {
  rule: string;
  provider: string;
  /** Stable reason code for client i18n — not a user-facing sentence. */
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
      'DIGITAL_RELEASE_UNSUPPORTED',
      'POST_FILTER',
    );
  }

  if (rules.maximumCertification && !capabilities.supportsAgeRating) {
    push(
      'maximumCertification',
      'CERTIFICATION_UNSUPPORTED',
      'POST_FILTER',
    );
  }

  if (rules.availableInRegion && !capabilities.supportsRegion) {
    push(
      'availableInRegion',
      'REGION_UNSUPPORTED',
      'IGNORE_AT_PROVIDER',
    );
  }

  if (
    (rules.originalLanguages?.length || rules.includeGenres?.length) &&
    !capabilities.supportsLanguage &&
    rules.originalLanguages?.length
  ) {
    push(
      'originalLanguages',
      'LANGUAGE_LIMITED',
      'POST_FILTER',
    );
  }

  if (rules.hideWatched && !capabilities.supportsTracking) {
    push(
      'hideWatched',
      'TRACKING_REQUIRED',
      'REQUIRES_TRACKING',
    );
  }

  return warnings;
}
