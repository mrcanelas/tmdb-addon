import type { AiProviderPort, DiscoveryPlan } from './types.js';
import {
  parseDiscoveryPrompt,
  validateDiscoveryPlan,
  discoveryPlanToRuleSet,
} from './discovery.js';
import { sanitizeAiContext } from './safety.js';
import { createSmartDiscoveryProposal } from './proposals.js';
import { buildExplanation } from './explain.js';

/**
 * Run Smart Discovery: optional AI refinement → schema validation → explainable proposal.
 * AI output that fails validation is rejected; heuristic fallback may be used.
 */
export async function runSmartDiscovery(input: {
  prompt: string;
  ai?: AiProviderPort;
  secrets?: Record<string, string | undefined>;
}): Promise<{
  plan: DiscoveryPlan;
  proposal: ReturnType<typeof createSmartDiscoveryProposal>;
  usedAi: boolean;
  redactedKeys: string[];
}> {
  const { prompt, redactedKeys } = sanitizeAiContext({
    prompt: input.prompt,
    secrets: input.secrets,
  });

  let plan = parseDiscoveryPrompt(prompt);
  let usedAi = false;

  if (input.ai) {
    const refined = await input.ai.proposeDiscoveryPlan(prompt);
    if (refined) {
      const merged = { ...plan, ...refined, rawPrompt: prompt };
      const validated = validateDiscoveryPlan(merged);
      if (validated.ok && validated.plan) {
        plan = validated.plan;
        usedAi = true;
      } else {
        plan = {
          ...plan,
          warnings: [
            ...plan.warnings,
            {
              code: 'AI_PLAN_REJECTED',
              params: { detail: (validated.issues ?? []).join('; ') },
            },
          ],
        };
      }
    }
  }

  const validated = validateDiscoveryPlan(plan);
  if (!validated.ok || !validated.plan) {
    throw new Error(`Discovery plan invalid: ${validated.issues.join('; ')}`);
  }

  // Ensure rules layer accepts the plan (never bypass schema).
  discoveryPlanToRuleSet(validated.plan);

  const proposal = createSmartDiscoveryProposal(validated.plan);
  proposal.explanation = buildExplanation({
    interpretedIntent: {
      code: 'DISCOVERY_PROMPT_INTENT',
      params: { prompt: validated.plan.rawPrompt },
    },
    generatedRules: discoveryPlanToRuleSet(validated.plan),
    providerSelection: usedAi && input.ai ? [input.ai.id] : ['heuristic-discovery'],
    assumptions: validated.plan.assumptions,
    warnings: validated.plan.warnings,
  });

  return {
    plan: validated.plan,
    proposal,
    usedAi,
    redactedKeys,
  };
}
