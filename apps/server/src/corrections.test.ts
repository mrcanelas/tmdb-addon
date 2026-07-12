import { afterAll, describe, expect, it } from 'vitest';
import { createDefaultMetaLayerConfig } from '@metalayer/config';
import { createMemoryConfigurationStore } from '@metalayer/persistence';
import { buildApp } from './app.js';

const TEST_KEY = Buffer.alloc(32, 41).toString('base64');

describe('@metalayer/server corrections', () => {
  const store = createMemoryConfigurationStore(TEST_KEY);
  const appPromise = buildApp({ logger: false, store });

  afterAll(async () => {
    await (await appPromise).close();
  });

  it('lists community corrections and applies local override with rollback', async () => {
    const app = await appPromise;
    const community = await app.inject({
      method: 'GET',
      url: '/api/v1/corrections',
    });
    expect(community.statusCode).toBe(200);
    expect(community.json().corrections.length).toBeGreaterThan(0);

    const created = await app.inject({
      method: 'POST',
      url: '/api/v1/configurations',
      payload: {
        editCredential: 'corr-edit',
        config: createDefaultMetaLayerConfig({ name: 'Corrections' }),
      },
    });
    expect(created.statusCode).toBe(201);
    const { configId } = created.json();
    const headers = { 'x-metalayer-edit-credential': 'corr-edit' };

    const local = await app.inject({
      method: 'POST',
      url: `/api/v1/configurations/${configId}/corrections`,
      headers,
      payload: {
        target: { provider: 'imdb', id: 'tt0137523', entityKind: 'movie' },
        type: 'title_correction',
        payload: { title: 'Fight Club (Local)' },
        reason: 'Prefer personal title',
        sources: [{ kind: 'manual', label: 'Operator preference' }],
      },
    });
    expect(local.statusCode).toBe(201);
    const correctionId = local.json().correction.id;

    const preview = await app.inject({
      method: 'POST',
      url: `/api/v1/configurations/${configId}/corrections/preview`,
      headers,
      payload: {
        provider: 'imdb',
        id: 'tt0137523',
        base: { title: 'Provider Title' },
      },
    });
    expect(preview.statusCode).toBe(200);
    expect(preview.json().applied.title).toBe('Fight Club (Local)');
    expect(preview.json().overlays[0].scope).toBe('local');

    const moderated = await app.inject({
      method: 'PATCH',
      url: `/api/v1/configurations/${configId}/corrections/${correctionId}`,
      headers,
      payload: { action: 'propose' },
    });
    expect(moderated.statusCode).toBe(200);
    expect(moderated.json().correction.status).toBe('proposed');

    const rollback = await app.inject({
      method: 'DELETE',
      url: `/api/v1/configurations/${configId}/corrections/${correctionId}`,
      headers,
    });
    expect(rollback.statusCode).toBe(200);
    expect(rollback.json().rolledBack).toBe(correctionId);
  });

  it('rejects forbidden stream URLs in correction payloads', async () => {
    const app = await appPromise;
    const created = await app.inject({
      method: 'POST',
      url: '/api/v1/configurations',
      payload: {
        editCredential: 'corr-bad',
        config: createDefaultMetaLayerConfig({ name: 'Bad Corr' }),
      },
    });
    const { configId } = created.json();

    const bad = await app.inject({
      method: 'POST',
      url: `/api/v1/configurations/${configId}/corrections`,
      headers: { 'x-metalayer-edit-credential': 'corr-bad' },
      payload: {
        target: { provider: 'imdb', id: 'tt1' },
        type: 'artwork_override',
        payload: { kind: 'poster', url: 'https://evil.example/movie.mp4' },
        reason: 'should fail',
      },
    });
    expect(bad.statusCode).toBe(400);
    expect(bad.json().code).toBe('CORRECTION_FORBIDDEN_CONTENT');
  });
});
