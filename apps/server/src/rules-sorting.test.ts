import { afterAll, describe, expect, it } from 'vitest';
import { createDefaultMetaLayerConfig } from '@metalayer/config';
import { createMemoryConfigurationStore } from '@metalayer/persistence';
import { buildApp } from './app.js';

const TEST_KEY = Buffer.alloc(32, 29).toString('base64');

describe('@metalayer/server rules and sorting', () => {
  const store = createMemoryConfigurationStore(TEST_KEY);
  const appPromise = buildApp({ logger: false, store });

  afterAll(async () => {
    await (await appPromise).close();
  });

  it('previews rule exclusions and sorting order independently', async () => {
    const app = await appPromise;
    const created = await app.inject({
      method: 'POST',
      url: '/api/v1/configurations',
      payload: {
        editCredential: 'rules-edit-credential',
        config: createDefaultMetaLayerConfig({
          name: 'Rules',
          globalRules: { minimumRating: 7, excludeAdult: true },
          globalSorting: {
            criteria: [{ field: 'rating', direction: 'desc' }],
            stable: true,
          },
        }),
      },
    });
    expect(created.statusCode).toBe(201);
    const { configId } = created.json();
    const headers = { 'x-metalayer-edit-credential': 'rules-edit-credential' };

    const rulesPreview = await app.inject({
      method: 'POST',
      url: `/api/v1/configurations/${configId}/rules/preview`,
      headers,
      payload: {
        items: [
          { id: 'low', rating: 5, adult: false },
          { id: 'high', rating: 8.5, adult: false },
          { id: 'adult', rating: 9, adult: true },
        ],
        provider: 'tmdb',
      },
    });
    expect(rulesPreview.statusCode).toBe(200);
    expect(rulesPreview.json().included).toEqual(['high']);
    expect(rulesPreview.json().excluded.sort()).toEqual(['adult', 'low']);

    const sortingPreview = await app.inject({
      method: 'POST',
      url: `/api/v1/configurations/${configId}/sorting/preview`,
      headers,
      payload: {
        items: [
          { id: 'b', title: 'B', rating: 7 },
          { id: 'a', title: 'A', rating: 9 },
        ],
      },
    });
    expect(sortingPreview.statusCode).toBe(200);
    expect(sortingPreview.json().order).toEqual(['a', 'b']);

    const updated = await app.inject({
      method: 'PUT',
      url: `/api/v1/configurations/${configId}/rules`,
      headers,
      payload: { globalRules: { minimumRating: 8, excludeAdult: true } },
    });
    expect(updated.statusCode).toBe(200);
    expect(updated.json().globalRules.minimumRating).toBe(8);
  });
});
