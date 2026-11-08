import { afterAll, describe, expect, it } from 'vitest';
import { createDefaultMetaLayerConfig } from '@metalayer/config';
import { createMemoryConfigurationStore } from '@metalayer/persistence';
import { buildApp } from './app.js';

const TEST_KEY = Buffer.alloc(32, 31).toString('base64');

describe('@metalayer/server Meta Inspector', () => {
  const store = createMemoryConfigurationStore(TEST_KEY);
  const appPromise = buildApp({ logger: false, store });

  afterAll(async () => {
    await (await appPromise).close();
  });

  it('inspects dry-run contributions and explains every field source', async () => {
    const app = await appPromise;
    const created = await app.inject({
      method: 'POST',
      url: '/api/v1/configurations',
      payload: {
        editCredential: 'inspect-edit-credential',
        config: createDefaultMetaLayerConfig({
          name: 'Inspector',
          localization: {
            interfaceLocale: 'pt-BR',
            metadataLocale: 'pt-BR',
            metadataFallbackLocales: ['en-US'],
            titleMode: 'localized-with-original',
            descriptionMode: 'localized',
            contentRegion: 'BR',
            timezone: 'America/Sao_Paulo',
          },
        }),
      },
    });
    expect(created.statusCode).toBe(201);
    const { configId } = created.json();
    const headers = { 'x-metalayer-edit-credential': 'inspect-edit-credential' };

    const inspect = await app.inject({
      method: 'POST',
      url: `/api/v1/configurations/${configId}/inspect`,
      headers,
      payload: {
        id: 'tt0137523',
        mediaType: 'movie',
        contributions: {
          title: [
            { provider: 'tmdb', value: 'Fight Club', locale: 'en-US' },
            { provider: 'tmdb', value: 'Clube da Luta', locale: 'pt-BR' },
          ],
          originalTitle: [{ provider: 'tmdb', value: 'Fight Club' }],
          description: [
            { provider: 'tmdb', value: 'Um homem deprimido…', locale: 'pt-BR' },
          ],
          poster: [
            { provider: 'rpdb', value: null },
            { provider: 'fanart', value: 'https://fanart/p.jpg' },
            { provider: 'tmdb', value: 'https://tmdb/p.jpg' },
          ],
          background: [{ provider: 'tmdb', value: 'https://tmdb/b.jpg' }],
          rating: [
            { provider: 'imdb', value: 8.8, confidence: 0.95 },
            { provider: 'tmdb', value: 8.4, confidence: 0.6 },
          ],
          voteCount: [{ provider: 'tmdb', value: 28000 }],
          releaseDate: [{ provider: 'tmdb', value: '1999-10-15' }],
          externalIds: [
            { provider: 'tmdb', value: { tmdb: 550, imdb: 'tt0137523' } },
          ],
        },
      },
    });

    expect(inspect.statusCode).toBe(200);
    const { report } = inspect.json();
    expect(report.fields.displayTitle).toBe('Clube da Luta (Fight Club)');
    expect(report.fields.poster.selectedProvider).toBe('fanart');
    expect(report.fields.rating.selectedProvider).toBe('imdb');
    expect(report.fields.title.selectedProvider).toBe('tmdb');
    expect(report.fields.title.selectedLocale).toBe('pt-BR');
    expect(report.identity.matches.imdb).toBe('tt0137523');
    expect(report.fields.poster.attemptedProviders).toEqual([
      'rpdb',
      'fanart',
      'tmdb',
      'imdb',
    ]);
    expect(inspect.json().identity.diagnostics.canonicalId).toMatch(
      /^metalayer:movie:/,
    );
  });

  it('updates field provider chains', async () => {
    const app = await appPromise;
    const created = await app.inject({
      method: 'POST',
      url: '/api/v1/configurations',
      payload: {
        editCredential: 'chains-edit',
        config: createDefaultMetaLayerConfig({ name: 'Chains' }),
      },
    });
    const { configId } = created.json();
    const headers = { 'x-metalayer-edit-credential': 'chains-edit' };

    const updated = await app.inject({
      method: 'PUT',
      url: `/api/v1/configurations/${configId}/field-providers`,
      headers,
      payload: {
        fieldProviders: {
          title: ['tmdb', 'tvdb'],
          originalTitle: ['tmdb'],
          description: ['tmdb'],
          poster: ['tmdb'],
          background: ['tmdb'],
          rating: ['tmdb'],
          voteCount: ['tmdb'],
          releaseDate: ['tmdb'],
          externalIds: ['tmdb'],
        },
      },
    });
    expect(updated.statusCode).toBe(200);
    expect(updated.json().fieldProviders.poster).toEqual(['tmdb']);
    expect(updated.json().fieldProviders.title).toEqual(['tmdb', 'tvdb']);
  });
});
