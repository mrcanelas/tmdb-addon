import { afterAll, describe, expect, it } from 'vitest';
import { createDefaultMetaLayerConfig } from '@metalayer/config';
import { createMemoryConfigurationStore } from '@metalayer/persistence';
import { buildApp } from './app.js';

const TEST_KEY = Buffer.alloc(32, 43).toString('base64');

describe('@metalayer/server search-ai', () => {
  const store = createMemoryConfigurationStore(TEST_KEY);
  const appPromise = buildApp({ logger: false, store });

  afterAll(async () => {
    await (await appPromise).close();
  });

  it('runs smart discovery and refuses apply without confirm', async () => {
    const app = await appPromise;
    const created = await app.inject({
      method: 'POST',
      url: '/api/v1/configurations',
      payload: {
        editCredential: 'search-edit',
        config: createDefaultMetaLayerConfig({ name: 'Search AI' }),
      },
    });
    expect(created.statusCode).toBe(201);
    const { configId } = created.json();
    const headers = { 'x-metalayer-edit-credential': 'search-edit' };

    const discovery = await app.inject({
      method: 'POST',
      url: `/api/v1/configurations/${configId}/search/smart-discovery`,
      headers,
      payload: {
        prompt: 'Investigation movies without horror and under two hours.',
      },
    });
    expect(discovery.statusCode).toBe(200);
    expect(discovery.json().plan.runtimeMax).toBe(120);
    expect(discovery.json().requiresConfirmation).toBe(true);
    const proposalId = discovery.json().proposal.id;

    const denied = await app.inject({
      method: 'POST',
      url: `/api/v1/configurations/${configId}/ai/apply-proposal`,
      headers,
      payload: { proposalId, confirm: false },
    });
    expect(denied.statusCode).toBe(400);
    expect(denied.json().code).toBe('AI_CONFIRMATION_REQUIRED');

    const applied = await app.inject({
      method: 'POST',
      url: `/api/v1/configurations/${configId}/ai/apply-proposal`,
      headers,
      payload: { proposalId, confirm: true },
    });
    expect(applied.statusCode).toBe(200);
    expect(applied.json().globalRules.excludeGenres).toContain('Horror');
  });

  it('builds ranked list and saves catalog only after confirmation', async () => {
    const app = await appPromise;
    const created = await app.inject({
      method: 'POST',
      url: '/api/v1/configurations',
      payload: {
        editCredential: 'ranked-edit',
        config: createDefaultMetaLayerConfig({ name: 'Ranked' }),
      },
    });
    const { configId } = created.json();
    const headers = { 'x-metalayer-edit-credential': 'ranked-edit' };

    const ranked = await app.inject({
      method: 'POST',
      url: `/api/v1/configurations/${configId}/search/ranked-list`,
      headers,
      payload: { prompt: 'Best science-fiction movies of all time.' },
    });
    expect(ranked.statusCode).toBe(200);
    expect(ranked.json().duplicates.length).toBeGreaterThan(0);
    expect(ranked.json().unresolved.length).toBeGreaterThan(0);
    const proposalId = ranked.json().proposal.id;

    const saved = await app.inject({
      method: 'POST',
      url: `/api/v1/configurations/${configId}/ai/apply-proposal`,
      headers,
      payload: {
        proposalId,
        confirm: true,
        name: 'Sci-Fi Classics',
      },
    });
    expect(saved.statusCode).toBe(200);
    expect(saved.json().applied).toBe('ranked-list-catalog');
    expect(
      saved.json().catalogs.some(
        (item: { customName?: string; providerCatalogId: string }) =>
          item.providerCatalogId === 'ai.ranked-list',
      ),
    ).toBe(true);

    const combined = await app.inject({
      method: 'POST',
      url: `/api/v1/configurations/${configId}/search/combined`,
      headers,
      payload: { query: 'Fight' },
    });
    expect(combined.statusCode).toBe(200);
    expect(combined.json().hits.length).toBeGreaterThan(0);
  });
});
