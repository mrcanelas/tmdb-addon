export {
  evaluateRules,
  type RuleCandidate,
  type RuleEvaluation,
  type RuleExplanation,
} from './evaluate.js';

export {
  mergeRuleSets,
  resolveEffectiveRules,
  type RuleLayer,
} from './inheritance.js';

export {
  checkProviderRuleSupport,
  type UnsupportedRuleWarning,
} from './provider-limitations.js';
