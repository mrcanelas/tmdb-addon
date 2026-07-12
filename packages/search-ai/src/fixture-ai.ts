import type { AiProviderPort, DiscoveryPlan, MediaType, RankedListCandidate } from './types.js';
import { parseDiscoveryPrompt } from './discovery.js';
import { fixtureRankedCandidates } from './ranked-list.js';

/**
 * Offline AI port used in CI and demos.
 * Never contacts network and never accepts secrets (callers sanitize first).
 */
export class FixtureAiProvider implements AiProviderPort {
  readonly id = 'fixture-ai';

  async proposeDiscoveryPlan(prompt: string): Promise<Partial<DiscoveryPlan> | null> {
    return parseDiscoveryPrompt(prompt);
  }

  async proposeRankedCandidates(
    prompt: string,
    _mediaType: MediaType,
  ): Promise<RankedListCandidate[]> {
    return fixtureRankedCandidates(prompt);
  }
}
