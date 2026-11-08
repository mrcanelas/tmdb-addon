import type { RuleContext, RuleSet } from '@metalayer/config';

export interface RuleLayer {
  context: RuleContext;
  rules: RuleSet;
}

const LAYER_ORDER: RuleContext[] = ['global', 'profile', 'catalog', 'home', 'search', 'recommendations'];

/**
 * Merge rule layers with explicit inheritance:
 * Global → Profile → Catalog → Context (later layers override defined keys).
 */
export function mergeRuleSets(layers: RuleLayer[]): RuleSet {
  const ordered = [...layers].sort(
    (a, b) => LAYER_ORDER.indexOf(a.context) - LAYER_ORDER.indexOf(b.context),
  );

  const merged: RuleSet = {};
  for (const layer of ordered) {
    for (const [key, value] of Object.entries(layer.rules) as Array<
      [keyof RuleSet, RuleSet[keyof RuleSet]]
    >) {
      if (value !== undefined) {
        (merged as Record<string, unknown>)[key] = value;
      }
    }
  }
  return merged;
}

/** Build effective rules for a catalog request context. */
export function resolveEffectiveRules(input: {
  global?: RuleSet;
  profile?: RuleSet;
  catalog?: RuleSet;
  context?: Exclude<RuleContext, 'global' | 'profile' | 'catalog'>;
  contextRules?: RuleSet;
}): RuleSet {
  const layers: RuleLayer[] = [];
  if (input.global) layers.push({ context: 'global', rules: input.global });
  if (input.profile) layers.push({ context: 'profile', rules: input.profile });
  if (input.catalog) layers.push({ context: 'catalog', rules: input.catalog });
  if (input.context && input.contextRules) {
    layers.push({ context: input.context, rules: input.contextRules });
  }
  return mergeRuleSets(layers);
}
