import { describe, expect, it } from 'vitest';
import { evaluateRules } from '@metalayer/rules';
import {
  annotateWatchedCandidates,
  buildWatchStateIndex,
  isWatchedStatus,
  normalizeWatchStatus,
  safeLoadWatchStates,
  transitionTokenState,
} from './index.js';

describe('@metalayer/tracking', () => {
  it('normalizes watch statuses and token transitions', () => {
    expect(normalizeWatchStatus('Completed')).toBe('completed');
    expect(normalizeWatchStatus('plan-to-watch')).toBe('plan_to_watch');
    expect(isWatchedStatus('completed')).toBe(true);
    expect(isWatchedStatus('plan_to_watch')).toBe(false);

    expect(transitionTokenState('not_configured', { type: 'auth_success' })).toBe(
      'connected',
    );
    expect(transitionTokenState('connected', { type: 'refresh_failed' })).toBe(
      'expired',
    );
    expect(transitionTokenState('connected', { type: 'unauthorized' })).toBe(
      'invalid',
    );
    expect(transitionTokenState('connected', { type: 'upstream_error' })).toBe(
      'degraded',
    );
  });

  it('annotates candidates so hideWatched can exclude them', () => {
    const index = buildWatchStateIndex('trakt', [
      {
        provider: 'trakt',
        mediaType: 'movie',
        status: 'completed',
        externalIds: { imdb: 'tt0137523', tmdb: 550 },
      },
    ]);

    const annotated = annotateWatchedCandidates(
      [
        { id: 'tt0137523', title: 'Fight Club' },
        { id: 'tt0111161', title: 'Shawshank' },
      ],
      index,
      (item) => ({ imdb: item.id }),
    );

    expect(annotated[0]!.watched).toBe(true);
    expect(annotated[1]!.watched).toBe(false);

    const hidden = evaluateRules(annotated[0]!, { hideWatched: true });
    const kept = evaluateRules(annotated[1]!, { hideWatched: true });
    expect(hidden.include).toBe(false);
    expect(kept.include).toBe(true);
  });

  it('degrades on tracking failure without throwing', async () => {
    const result = await safeLoadWatchStates('trakt', async () => {
      throw new Error('Trakt 401');
    });
    expect(result.failure?.code).toBe('upstream');
    expect(result.index.degraded).toBe(true);
    expect(result.entries).toEqual([]);
  });
});
