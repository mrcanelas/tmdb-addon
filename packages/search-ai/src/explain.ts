import type { RuleSet } from '@metalayer/config';
import type { AiExplanation } from './types.js';

export function buildExplanation(input: {
  interpretedIntent: string;
  generatedRules: RuleSet;
  providerSelection: string[];
  unresolvedItems?: string[];
  assumptions?: string[];
  warnings?: string[];
}): AiExplanation {
  return {
    interpretedIntent: input.interpretedIntent,
    generatedRules: input.generatedRules,
    providerSelection: input.providerSelection,
    unresolvedItems: input.unresolvedItems ?? [],
    assumptions: input.assumptions ?? [],
    warnings: input.warnings ?? [],
  };
}
