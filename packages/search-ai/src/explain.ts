import type { RuleSet } from '@metalayer/config';
import type { AiExplanation, SearchAiNotice } from './types.js';

export function buildExplanation(input: {
  interpretedIntent: SearchAiNotice;
  generatedRules: RuleSet;
  providerSelection: string[];
  unresolvedItems?: string[];
  assumptions?: SearchAiNotice[];
  warnings?: SearchAiNotice[];
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
