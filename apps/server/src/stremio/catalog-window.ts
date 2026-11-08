import { createHash } from 'node:crypto';
import type { CatalogMetaPreview } from '@metalayer/catalogs';
import type { CatalogDefinition, MetaLayerConfig, SortingPlan } from '@metalayer/config';
import { applyPolicy, type CatalogWarning } from './catalog-policy.js';
import {
  loadCatalogPage,
  type SecretResolver,
  type StremioAppContext,
} from './catalog-meta.js';

export const CATALOG_PAGE_SIZE = 20;

export interface CatalogWindowOptions {
  /** Native configuration scope, including for authenticated Studio previews. */
  configId?: string;
  /** Profile id when serving `/c/:configId/p/:profileId/...`; part of the cache key. */
  profileId?: string;
  /** Max upstream pages fetched during one request (protects public instances). */
  maxPagesPerRequest?: number;
  /** Pages gathered before sorting the whole buffer (only when a sorting plan exists). */
  sortBudgetPages?: number;
  /** Window lifetime in the shared cache. */
  ttlMs?: number;
  /** Skip the shared cache (Studio preview with ad-hoc credentials). */
  bypassCache?: boolean;
}

export interface CatalogWindowResult {
  metas: CatalogMetaPreview[];
  warnings: CatalogWarning[];
  /** Diagnostics for Studio preview / Inspector. */
  window: {
    bufferedItems: number;
    sourcePagesFetched: number;
    exhausted: boolean;
    sortedItems: number;
    cache: 'hit' | 'miss' | 'bypass';
  };
}

interface WindowState {
  version: 1;
  items: CatalogMetaPreview[];
  /** Next upstream page to fetch (1-based). */
  nextPage: number;
  exhausted: boolean;
  /** Items [0, sortedCount) were sorted as one unit; later pages append in source order. */
  sortedCount: number;
  warnings: CatalogWarning[];
}

const DEFAULTS = {
  maxPagesPerRequest: 25,
  sortBudgetPages: 10,
  ttlMs: 10 * 60 * 1000,
};

/**
 * Resolve window budgets. Env values are a bootstrap fallback; the Dashboard
 * runtime settings (W5) override them through `app.runtimeSettings` when present.
 */
export function resolveCatalogWindowOptions(
  app: Pick<StremioAppContext, 'runtimeSettings'>,
  options: CatalogWindowOptions,
): Required<Pick<CatalogWindowOptions, 'maxPagesPerRequest' | 'sortBudgetPages' | 'ttlMs'>> {
  const fromSettings = app.runtimeSettings;
  const envScan = Number(process.env.METALAYER_CATALOG_SCAN_PAGES);
  const envSort = Number(process.env.METALAYER_CATALOG_SORT_PAGES);
  const envTtl = Number(process.env.METALAYER_CATALOG_WINDOW_TTL_MS);
  const positive = (value: unknown, fallback: number) =>
    typeof value === 'number' && Number.isFinite(value) && value > 0 ? Math.floor(value) : fallback;
  return {
    maxPagesPerRequest: positive(
      options.maxPagesPerRequest ?? fromSettings?.getNumber?.('METALAYER_CATALOG_SCAN_PAGES') ?? envScan,
      DEFAULTS.maxPagesPerRequest,
    ),
    sortBudgetPages: positive(
      options.sortBudgetPages ?? fromSettings?.getNumber?.('METALAYER_CATALOG_SORT_PAGES') ?? envSort,
      DEFAULTS.sortBudgetPages,
    ),
    ttlMs: positive(
      options.ttlMs ?? fromSettings?.getNumber?.('METALAYER_CATALOG_WINDOW_TTL_MS') ?? envTtl,
      DEFAULTS.ttlMs,
    ),
  };
}

function metaKey(meta: CatalogMetaPreview): string {
  return `${meta.type}:${meta.id}`;
}

function planNeedsGlobalSort(plan?: SortingPlan): boolean {
  return Boolean(plan && plan.criteria.some((criterion) => criterion.field !== 'sourceOrder'));
}

/** Stable key: every response-affecting value, never secrets (AGENTS.md §28.2). */
export function catalogWindowCacheKey(
  config: MetaLayerConfig,
  catalog: CatalogDefinition,
  scope: Pick<CatalogWindowOptions, 'configId' | 'profileId'>,
): string {
  const hash = createHash('sha256');
  hash.update(
    JSON.stringify({
      configId: scope.configId ?? null,
      profileId: scope.profileId ?? null,
      instanceId: catalog.instanceId,
      catalogs: config.catalogs,
      globalRules: config.globalRules,
      globalSorting: config.globalSorting ?? null,
      presentation: config.presentation ?? null,
      localization: {
        metadataLocale: config.localization.metadataLocale,
        availabilityRegion: config.localization.availabilityRegion ?? null,
        contentRegion: config.localization.contentRegion,
      },
      identity: config.identity,
    }),
  );
  return `catalog-window:v2:${hash.digest('hex')}`;
}

const DEGRADED_WARNINGS = new Set([
  'SOURCE_CREDENTIAL_MISSING',
  'SOURCE_CREDENTIAL_INVALID',
  'CATALOG_PROVIDER_UNAVAILABLE',
]);

function dedupeWarnings(warnings: CatalogWarning[]): CatalogWarning[] {
  return [...new Map(warnings.map((warning) => [JSON.stringify(warning), warning])).values()];
}

/**
 * Materialized catalog window: filtered cards accumulate in a shared buffer so
 * `skip` never restarts from page 1, and sorting plans run over the gathered
 * buffer (within the sort budget) instead of one upstream page at a time.
 */
export async function loadCatalogWindow(
  app: StremioAppContext,
  config: MetaLayerConfig,
  catalog: CatalogDefinition,
  skip: number,
  correlationId: string,
  getSecret: SecretResolver,
  options: CatalogWindowOptions = {},
): Promise<CatalogWindowResult> {
  const budgets = resolveCatalogWindowOptions(app, options);
  const key = catalogWindowCacheKey(config, catalog, options);
  const target = Math.max(0, skip) + CATALOG_PAGE_SIZE;
  const plan = catalog.sorting ?? config.globalSorting;
  const globalSort = planNeedsGlobalSort(plan);

  let cache: CatalogWindowResult['window']['cache'] = 'bypass';
  let state: WindowState = { version: 1, items: [], nextPage: 1, exhausted: false, sortedCount: 0, warnings: [] };
  if (!options.bypassCache) {
    const cached = await app.providerCache.get<WindowState>(key);
    if (cached && cached.entry.value.version === 1) {
      state = { ...cached.entry.value, items: [...cached.entry.value.items], warnings: [...cached.entry.value.warnings] };
      cache = 'hit';
    } else {
      cache = 'miss';
    }
  }

  const seen = new Set(state.items.map(metaKey));
  const warnings: CatalogWarning[] = [...state.warnings];
  let fetched = 0;
  let appended = 0;

  const sortWindowOpen = () => globalSort && state.sortedCount === 0 && state.nextPage <= budgets.sortBudgetPages;

  while (!state.exhausted && fetched < budgets.maxPagesPerRequest) {
    const haveEnough = state.items.length >= target;
    if (haveEnough && !sortWindowOpen()) break;
    const page = await loadCatalogPage(app, config, catalog, state.nextPage, correlationId, getSecret, { sort: false });
    fetched++;
    warnings.push(...page.warnings);
    for (const meta of page.metas) {
      const id = metaKey(meta);
      if (seen.has(id)) continue;
      seen.add(id);
      state.items.push(meta);
      appended++;
    }
    state.nextPage++;
    if (!page.hasMore) state.exhausted = true;
  }

  if (!state.exhausted && fetched >= budgets.maxPagesPerRequest && state.items.length < target) {
    warnings.push({ code: 'CATALOG_SCAN_LIMIT', params: { maxPages: budgets.maxPagesPerRequest } });
  }

  if (globalSort && plan) {
    const budgetReached = state.exhausted || state.nextPage > budgets.sortBudgetPages;
    if (state.sortedCount === 0 && budgetReached) {
      // Sort once over the gathered buffer; later pages append after it so already
      // delivered offsets never shift.
      const sorted = applyPolicy(state.items, { rules: {}, plan, seedKey: catalog.instanceId }).metas;
      state.items = sorted;
      state.sortedCount = sorted.length;
    } else if (state.sortedCount > 0 && appended > 0) {
      // Keep the frozen head; the tail stays in source order.
    }
    warnings.push({
      code: 'CATALOG_SORT_SCOPE',
      params: {
        sortedItems: state.sortedCount || state.items.length,
        sourcePages: state.nextPage - 1,
        complete: state.exhausted,
      },
    });
  }

  state.warnings = dedupeWarnings(
    warnings.filter((warning) => warning.code !== 'CATALOG_SCAN_LIMIT' && warning.code !== 'CATALOG_SORT_SCOPE'),
  );

  // Degraded windows (missing/invalid credentials, unavailable provider) must not
  // poison the shared cache — a later connect must take effect immediately (§28.4).
  const degraded = state.warnings.some((warning) => DEGRADED_WARNINGS.has(warning.code));
  if (!options.bypassCache && !degraded) {
    await app.providerCache.set(key, state, { ttlMs: budgets.ttlMs, source: 'catalog-window' });
  } else if (!options.bypassCache && degraded && cache === 'hit') {
    await app.providerCache.delete(key);
  }

  return {
    metas: state.items.slice(skip, skip + CATALOG_PAGE_SIZE),
    warnings: dedupeWarnings(warnings),
    window: {
      bufferedItems: state.items.length,
      sourcePagesFetched: state.nextPage - 1,
      exhausted: state.exhausted,
      sortedItems: state.sortedCount,
      cache,
    },
  };
}
