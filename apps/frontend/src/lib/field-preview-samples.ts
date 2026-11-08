import type { FieldRailId } from '@/lib/field-registry';

/** Display payload for the Stremio-like Fields preview (sample title). */
export interface FieldPreviewMeta {
  id: string;
  mediaType: 'movie' | 'series' | 'anime';
  name: string;
  logo?: string;
  background?: string;
  poster?: string;
  runtime?: string;
  releaseInfo?: string;
  description?: string;
  imdbRating?: string;
  genres: string[];
  cast: string[];
  directors: string[];
  originalLanguage: string;
}

/** Deterministic contributions for Fields preview (resolver input only). */
export const FIELD_PREVIEW_SAMPLE: FieldPreviewMeta & {
  title: string;
  years: string;
} = {
  id: 'tt0903747',
  mediaType: 'series',
  title: 'Breaking Bad',
  name: 'Breaking Bad',
  years: '2008 – 2013',
  releaseInfo: '2008 – 2013',
  runtime: '47 min',
  originalLanguage: 'en',
  imdbRating: '9.5',
  description:
    'A chemistry teacher diagnosed with cancer turns to cooking meth with a former student to secure his family’s future.',
  logo: 'https://image.tmdb.org/t/p/w500/chw44B2VnLha8iiTdyZcIW0ZELC.png',
  background:
    'https:///image.tmdb.org/t/p/w1280/tsRy63Mu5cu8etL1X7ZLyf7UP1M.jpg',
  poster: 'https://image.tmdb.org/t/p/w500/ztkUQFLlC19CCMYHW9o1zWhJRNq.jpg',
  genres: ['Crime', 'Drama', 'Thriller'],
  cast: [
    'Bryan Cranston',
    'Aaron Paul',
    'Anna Gunn',
    'Dean Norris',
    'Betsy Brandt',
    'RJ Mitte',
  ],
  directors: ['Vince Gilligan', 'Michelle MacLaren', 'Adam Bernstein'],
};

export const FIELD_PREVIEW_CONTRIBUTIONS: Partial<
  Record<
    FieldRailId,
    Array<{
      provider: string;
      value?: unknown;
      locale?: string;
      confidence?: number;
    }>
  >
> = {
  title: [
    { provider: 'tmdb', value: 'Breaking Bad', locale: 'en-US', confidence: 0.95 },
    { provider: 'tmdb', value: 'Breaking Bad', locale: 'pt-BR', confidence: 0.9 },
    { provider: 'tvdb', value: 'Breaking Bad', locale: 'en-US', confidence: 0.85 },
    { provider: 'imdb', value: 'Breaking Bad', locale: 'en-US', confidence: 0.8 },
  ],
  originalTitle: [
    { provider: 'tmdb', value: 'Breaking Bad', confidence: 0.95 },
    { provider: 'tvdb', value: 'Breaking Bad', confidence: 0.9 },
  ],
  description: [
    {
      provider: 'tmdb',
      value:
        'A chemistry teacher diagnosed with cancer turns to cooking meth with a former student.',
      locale: 'en-US',
      confidence: 0.9,
    },
    {
      provider: 'tmdb',
      value:
        'Um professor de química com câncer começa a fabricar metanfetamina com um ex-aluno.',
      locale: 'pt-BR',
      confidence: 0.88,
    },
    {
      provider: 'tvdb',
      value: 'A high-school chemistry teacher turns to a life of crime.',
      locale: 'en-US',
      confidence: 0.7,
    },
  ],
  poster: [
    { provider: 'rpdb', value: null },
    {
      provider: 'fanart',
      value: 'https://image.tmdb.org/t/p/w500/ggFHVNu6YYI5L9pCfOacjizRGt.jpg',
      locale: undefined,
      confidence: 0.8,
    },
    {
      provider: 'tmdb',
      value: 'https://image.tmdb.org/t/p/w500/ggFHVNu6YYI5L9pCfOacjizRGt.jpg',
      locale: 'en',
      confidence: 0.85,
    },
  ],
  background: [
    {
      provider: 'fanart',
      value: 'https://image.tmdb.org/t/p/w1280/tsRy63Mu5cu8etL1X7ZEp2uj5IU.jpg',
      confidence: 0.85,
    },
    {
      provider: 'tmdb',
      value: 'https://image.tmdb.org/t/p/w1280/tsRy63Mu5cu8etL1X7ZEp2uj5IU.jpg',
      confidence: 0.8,
    },
  ],
  logo: [
    { provider: 'rpdb', value: null },
    {
      provider: 'fanart',
      value: 'https://image.tmdb.org/t/p/w500/9A4thHGfPwO65I3idBlJwHxEcTQ.png',
      confidence: 0.75,
    },
    {
      provider: 'tvdb',
      value: 'https://image.tmdb.org/t/p/w500/9A4thHGfPwO65I3idBlJwHxEcTQ.png',
      confidence: 0.7,
    },
  ],
  rating: [
    { provider: 'imdb', value: 9.5, confidence: 0.95 },
    { provider: 'tmdb', value: 8.9, confidence: 0.8 },
  ],
  voteCount: [
    { provider: 'tmdb', value: 14000, confidence: 0.9 },
    { provider: 'imdb', value: 2100000, confidence: 0.95 },
  ],
  releaseDate: [
    { provider: 'tmdb', value: '2008-01-20', confidence: 0.95 },
    { provider: 'tvdb', value: '2008-01-20', confidence: 0.9 },
  ],
  externalIds: [
    {
      provider: 'tmdb',
      value: { tmdb: 1396, imdb: 'tt0903747', tvdb: 81189 },
      confidence: 0.95,
    },
  ],
};

/**
 * Apply a single resolved field onto the sample meta so the Stremio-like
 * preview reflects the current Field Resolution Chain selection.
 */
export function applyResolvedFieldToPreview(
  base: FieldPreviewMeta,
  field: string,
  value: unknown,
): FieldPreviewMeta {
  if (value == null || value === '') return base;
  const next = { ...base };

  switch (field) {
    case 'title':
    case 'originalTitle':
      if (typeof value === 'string') next.name = value;
      break;
    case 'description':
      if (typeof value === 'string') next.description = value;
      break;
    case 'logo':
      if (typeof value === 'string') next.logo = value;
      break;
    case 'background':
      if (typeof value === 'string') next.background = value;
      break;
    case 'poster':
      if (typeof value === 'string') next.poster = value;
      break;
    case 'rating':
      next.imdbRating =
        typeof value === 'number' ? value.toFixed(1) : String(value);
      break;
    case 'releaseDate':
      if (typeof value === 'string' && value.length >= 4) {
        next.releaseInfo = value.slice(0, 4);
      }
      break;
    default:
      break;
  }

  return next;
}

/**
 * Compose the live preview from every field resolved so far.
 * The highlighted field is applied last so title vs originalTitle conflicts
 * favor the field currently being edited.
 */
export function buildPreviewMeta(
  results: Array<{ field: string; value: unknown; status?: string }>,
  highlightField?: string,
): FieldPreviewMeta {
  let meta: FieldPreviewMeta = { ...FIELD_PREVIEW_SAMPLE };
  const resolved = results.filter(
    (entry) => entry.status == null || entry.status === 'resolved',
  );
  const ordered = [
    ...resolved.filter((entry) => entry.field !== highlightField),
    ...resolved.filter((entry) => entry.field === highlightField),
  ];
  for (const entry of ordered) {
    meta = applyResolvedFieldToPreview(meta, entry.field, entry.value);
  }
  return meta;
}
