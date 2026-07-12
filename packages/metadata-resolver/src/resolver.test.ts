import { describe, expect, it } from 'vitest';
import { resolveField } from './field.js';
import {
  buildInspectorReport,
  formatTitle,
  resolveMetadata,
} from './resolve.js';

describe('resolveField', () => {
  it('picks the first valid provider in the chain', () => {
    const result = resolveField(
      [
        { provider: 'rpdb', value: null },
        { provider: 'fanart', value: 'https://fanart/poster.jpg' },
        { provider: 'tmdb', value: 'https://tmdb/poster.jpg' },
      ],
      ['rpdb', 'fanart', 'tmdb'],
    );
    expect(result.value).toBe('https://fanart/poster.jpg');
    expect(result.selectedProvider).toBe('fanart');
    expect(result.attemptedProviders).toEqual(['rpdb', 'fanart', 'tmdb']);
    expect(result.fallbackUsed).toBe(false);
    expect(result.exclusionReason).toBeUndefined();
  });

  it('picks the matching locale among same-provider variants', () => {
    const result = resolveField(
      [
        { provider: 'tmdb', value: 'Fight Club', locale: 'en-US' },
        { provider: 'tmdb', value: 'Clube da Luta', locale: 'pt-BR' },
      ],
      ['tmdb'],
      {
        policy: 'preferred-language',
        requestedLocale: 'pt-BR',
        fallbackLocales: ['en-US'],
      },
    );
    expect(result.value).toBe('Clube da Luta');
    expect(result.selectedLocale).toBe('pt-BR');
    expect(result.fallbackUsed).toBe(false);
  });

  it('prefers matching locale across providers', () => {
    const result = resolveField(
      [
        { provider: 'tmdb', value: 'Fight Club', locale: 'en-US', confidence: 0.9 },
        { provider: 'tvdb', value: 'Clube da Luta', locale: 'pt-BR', confidence: 0.7 },
      ],
      ['tmdb', 'tvdb'],
      {
        policy: 'preferred-language',
        requestedLocale: 'pt-BR',
        fallbackLocales: ['en-US'],
      },
    );
    expect(result.value).toBe('Clube da Luta');
    expect(result.selectedProvider).toBe('tvdb');
    expect(result.fallbackUsed).toBe(false);
    expect(result.selectedLocale).toBe('pt-BR');
  });

  it('marks fallback when only English is available', () => {
    const result = resolveField(
      [{ provider: 'tmdb', value: 'Fight Club', locale: 'en-US' }],
      ['tmdb'],
      {
        policy: 'preferred-language',
        requestedLocale: 'pt-BR',
        fallbackLocales: ['en-US'],
      },
    );
    expect(result.fallbackUsed).toBe(true);
    expect(result.warnings.some((w) => w.code === 'LOCALE_FALLBACK')).toBe(true);
  });

  it('explains exclusion when every provider is empty', () => {
    const result = resolveField(
      [
        { provider: 'rpdb', value: null },
        { provider: 'fanart', value: '' },
      ],
      ['rpdb', 'fanart', 'tmdb'],
    );
    expect(result.value).toBeNull();
    expect(result.selectedProvider).toBeNull();
    expect(result.exclusionReason).toMatch(/No provider/);
  });

  it('uses highest confidence for rating policy', () => {
    const result = resolveField(
      [
        { provider: 'tmdb', value: 8.4, confidence: 0.6 },
        { provider: 'imdb', value: 8.8, confidence: 0.95 },
      ],
      ['tmdb', 'imdb'],
      { policy: 'highest-confidence' },
    );
    expect(result.selectedProvider).toBe('imdb');
    expect(result.value).toBe(8.8);
  });
});

describe('formatTitle', () => {
  it('supports localized-with-original', () => {
    expect(
      formatTitle({
        localized: 'Clube da Luta',
        original: 'Fight Club',
        mode: 'localized-with-original',
      }),
    ).toBe('Clube da Luta (Fight Club)');
  });
});

describe('resolveMetadata + Meta Inspector', () => {
  it('explains the source of every resolved field', () => {
    const report = buildInspectorReport({
      bag: {
        title: [
          { provider: 'tmdb', value: 'Clube da Luta', locale: 'pt-BR' },
        ],
        originalTitle: [{ provider: 'tmdb', value: 'Fight Club' }],
        description: [
          { provider: 'tmdb', value: 'Um homem deprimido…', locale: 'pt-BR' },
        ],
        poster: [
          { provider: 'rpdb', value: null },
          { provider: 'fanart', value: 'https://fanart/p.jpg' },
          { provider: 'tmdb', value: 'https://image.tmdb.org/p.jpg' },
        ],
        background: [{ provider: 'tmdb', value: 'https://image.tmdb.org/b.jpg' }],
        rating: [
          { provider: 'imdb', value: 8.8, confidence: 0.95 },
          { provider: 'tmdb', value: 8.4, confidence: 0.6 },
        ],
        voteCount: [{ provider: 'tmdb', value: 28000 }],
        releaseDate: [{ provider: 'tmdb', value: '1999-10-15' }],
        externalIds: [
          {
            provider: 'tmdb',
            value: { tmdb: 550, imdb: 'tt0137523' },
          },
        ],
      },
      localization: {
        metadataLocale: 'pt-BR',
        metadataFallbackLocales: ['en-US'],
        titleMode: 'localized-with-original',
        descriptionMode: 'localized',
      },
      identity: { publicId: 'tt0137523', mediaType: 'movie' },
      fieldProviders: {
        title: ['tmdb'],
        originalTitle: ['tmdb'],
        description: ['tmdb'],
        poster: ['rpdb', 'fanart', 'tmdb'],
        background: ['fanart', 'tmdb'],
        rating: ['imdb', 'tmdb'],
        voteCount: ['tmdb'],
        releaseDate: ['tmdb'],
        externalIds: ['tmdb'],
      },
      timingMs: 12,
    });

    expect(report.fields.displayTitle).toBe('Clube da Luta (Fight Club)');
    expect(report.fields.poster.selectedProvider).toBe('fanart');
    expect(report.fields.rating.selectedProvider).toBe('imdb');
    expect(report.fields.title.selectedProvider).toBe('tmdb');
    expect(report.identity.matches.imdb).toBe('tt0137523');

    for (const key of [
      'title',
      'originalTitle',
      'description',
      'poster',
      'background',
      'rating',
      'voteCount',
      'releaseDate',
      'externalIds',
    ] as const) {
      const field = report.fields[key];
      expect(field.attemptedProviders.length).toBeGreaterThan(0);
      expect(field.selectedProvider).toBeTruthy();
      expect(field.value).not.toBeNull();
    }
  });

  it('continues the artwork chain when the first provider is empty', () => {
    const resolved = resolveMetadata(
      {
        poster: [
          { provider: 'rpdb', value: undefined },
          { provider: 'tmdb', value: 'https://tmdb/poster.jpg' },
        ],
      },
      {
        localization: {
          metadataLocale: 'en-US',
          metadataFallbackLocales: [],
          titleMode: 'localized',
          descriptionMode: 'localized',
        },
        fieldProviders: {
          title: ['tmdb'],
          originalTitle: ['tmdb'],
          description: ['tmdb'],
          poster: ['rpdb', 'fanart', 'tmdb'],
          background: ['tmdb'],
          rating: ['tmdb'],
          voteCount: ['tmdb'],
          releaseDate: ['tmdb'],
          externalIds: ['tmdb'],
        },
      },
    );
    expect(resolved.poster.selectedProvider).toBe('tmdb');
    expect(resolved.poster.attemptedProviders).toEqual(['rpdb', 'fanart', 'tmdb']);
  });
});
