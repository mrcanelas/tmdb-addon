import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createDefaultMetaLayerConfig } from '@metalayer/config';
import { createCatalogInstance } from '@metalayer/catalogs';
import { createMemoryConfigurationStore } from '@metalayer/persistence';
import { summarizeLatency } from '@metalayer/observability';
import { buildApp } from './app.js';

/**
 * Phase M performance harness (AGENTS.md §34).
 * Measures p95 for cached native routes with mocked providers.
 * Strict thresholds are optional via METALAYER_PERF_STRICT=true (local/CI opt-in).
 */
const TEST_KEY = Buffer.alloc(32, 55).toString('base64');
const ITERATIONS = Number(process.env.METALAYER_PERF_ITERATIONS ?? 20);
const STRICT = /^(1|true|yes)$/i.test(
  process.env.METALAYER_PERF_STRICT?.trim() ?? '',
);

/** Cached objectives from AGENTS.md §34 (milliseconds). */
const OBJECTIVES = {
  manifest: 100,
  catalog: 250,
  metadata: 200,
  configRead: 150,
  configSave: 700,
} as const;

/** Sanity ceiling so CI fails on hangs without being machine-flaky. */
const SANITY_MULTIPLIER = 40;

async function timeRequest(
  run: () => Promise<{ statusCode: number }>,
): Promise<number> {
  const started = performance.now();
  const response = await run();
  const elapsed = performance.now() - started;
  expect(response.statusCode).toBeGreaterThanOrEqual(200);
  expect(response.statusCode).toBeLessThan(500);
  return elapsed;
}

async function measure(
  label: keyof typeof OBJECTIVES,
  run: () => Promise<{ statusCode: number }>,
  iterations: number,
) {
  // Warm-up (excluded from percentiles) — approximates cached path.
  await run();
  await run();

  const samples: number[] = [];
  for (let i = 0; i < iterations; i += 1) {
    samples.push(await timeRequest(run));
  }

  const summary = summarizeLatency(samples);
  const objective = OBJECTIVES[label];
  console.info(
    `[perf] ${label}: p50=${summary.p50.toFixed(1)}ms p95=${summary.p95.toFixed(1)}ms p99=${summary.p99.toFixed(1)}ms avg=${summary.avg.toFixed(1)}ms max=${summary.max.toFixed(1)}ms (objective p95 < ${objective}ms)`,
  );

  expect(summary.samples).toBe(iterations);
  expect(summary.p95).toBeLessThan(objective * SANITY_MULTIPLIER);

  if (STRICT) {
    expect(summary.p95).toBeLessThan(objective);
  }

  return summary;
}

describe('@metalayer/server performance harness (§34)', () => {
  const store = createMemoryConfigurationStore(TEST_KEY);
  let app: Awaited<ReturnType<typeof buildApp>>;
  let configId: string;
  let editCredential: string;

  beforeAll(async () => {
    editCredential = 'perf-harness-edit-credential';
    app = await buildApp({
      logger: false,
      store,
      providerFetch: async (input) => {
        const url = String(input);
        if (url.includes('/trending/')) {
          return new Response(
            JSON.stringify({
              results: [
                {
                  id: 550,
                  title: 'Fight Club',
                  poster_path: '/p.jpg',
                  release_date: '1999-10-15',
                },
              ],
            }),
            { status: 200, headers: { 'Content-Type': 'application/json' } },
          );
        }
        if (url.includes('/find/')) {
          return new Response(
            JSON.stringify({ movie_results: [{ id: 550 }] }),
            { status: 200, headers: { 'Content-Type': 'application/json' } },
          );
        }
        if (url.includes('/movie/550')) {
          return new Response(
            JSON.stringify({
              id: 550,
              title: 'Fight Club',
              overview: 'An insomniac…',
              poster_path: '/p.jpg',
              backdrop_path: '/b.jpg',
              release_date: '1999-10-15',
              vote_average: 8.4,
              vote_count: 28000,
              imdb_id: 'tt0137523',
            }),
            { status: 200, headers: { 'Content-Type': 'application/json' } },
          );
        }
        return new Response('{}', { status: 404 });
      },
    });

    const movie = createCatalogInstance({
      provider: 'tmdb',
      providerCatalogId: 'trending',
      mediaType: 'movie',
      originalName: 'Trending Movies',
      position: 0,
    });

    const created = await app.inject({
      method: 'POST',
      url: '/api/v1/configurations',
      payload: {
        editCredential,
        secrets: { tmdb: 'perf-tmdb-key' },
        config: createDefaultMetaLayerConfig({
          name: 'Perf Harness',
          catalogs: [movie],
        }),
      },
    });
    expect(created.statusCode).toBe(201);
    configId = created.json().configId;
  });

  afterAll(async () => {
    await app?.close();
  });

  it('measures cached manifest p95', async () => {
    await measure(
      'manifest',
      () =>
        app.inject({
          method: 'GET',
          url: `/c/${configId}/manifest.json`,
        }),
      ITERATIONS,
    );
  });

  it('measures cached catalog p95', async () => {
    await measure(
      'catalog',
      () =>
        app.inject({
          method: 'GET',
          url: `/c/${configId}/catalog/movie/tmdb.trending.json`,
        }),
      ITERATIONS,
    );
  });

  it('measures cached metadata p95', async () => {
    await measure(
      'metadata',
      () =>
        app.inject({
          method: 'GET',
          url: `/c/${configId}/meta/movie/tt0137523.json`,
        }),
      ITERATIONS,
    );
  });

  it('measures configuration read p95', async () => {
    await measure(
      'configRead',
      () =>
        app.inject({
          method: 'GET',
          url: `/api/v1/configurations/${configId}`,
          headers: {
            'x-metalayer-edit-credential': editCredential,
          },
        }),
      ITERATIONS,
    );
  });

  it('measures configuration save p95', async () => {
    await measure(
      'configSave',
      async () => {
        const current = await app.inject({
          method: 'GET',
          url: `/api/v1/configurations/${configId}`,
          headers: {
            'x-metalayer-edit-credential': editCredential,
          },
        });
        const config = current.json().config;
        return app.inject({
          method: 'PUT',
          url: `/api/v1/configurations/${configId}`,
          headers: {
            'x-metalayer-edit-credential': editCredential,
          },
          payload: {
            config: {
              ...config,
              name: `Perf Harness ${Date.now()}`,
            },
            note: 'perf harness',
          },
        });
      },
      Math.min(ITERATIONS, 10),
    );
  });
});
