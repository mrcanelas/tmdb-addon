import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Search } from 'lucide-react';
import { Input, Tabs } from '@metalayer/shared-ui';
import { useSourcesQuery } from '@/api/hooks/use-sources';
import { ConnectedSourcesPanel } from '@/components/sources/ConnectedSourcesPanel';
import { SourceCatalogCard } from '@/components/sources/SourceCatalogCard';
import { SourceConfigureModal } from '@/components/sources/SourceConfigureModal';
import { PublicMetaDBConfigureModal } from '@/components/sources/PublicMetaDBConfigureModal';
import { EmptyState } from '@/components/metalayer/EmptyState';
import { ErrorState } from '@/components/metalayer/ErrorState';
import { LoadingState } from '@/components/metalayer/LoadingState';
import { usePageHeader } from '@/contexts/page-title';
import type { ProviderCategory, PublicSource } from '@/lib/api';
import {
  SOURCE_CATEGORIES,
  filterSources,
  groupByPrimaryCategory,
  isManagedConnection,
} from '@/lib/source-filters';

type CategoryFilter = ProviderCategory | 'all';

export function SourcesPage() {
  const { t } = useTranslation(['sources', 'common']);
  usePageHeader(t('sources.title'), t('sources.intro'));
  const { data: sources = [], isLoading, isError, refetch, isFetching } =
    useSourcesQuery();

  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<CategoryFilter>('all');
  const [configureSource, setConfigureSource] = useState<PublicSource | null>(
    null,
  );

  const filtered = useMemo(
    () => filterSources(sources, { query, category }),
    [sources, query, category],
  );

  const grouped = useMemo(
    () => groupByPrimaryCategory(filtered),
    [filtered],
  );

  const connectedSources = useMemo(
    () => sources.filter((source) => isManagedConnection(source.connectionState)),
    [sources],
  );

  const visibleCategories = useMemo(
    () =>
      SOURCE_CATEGORIES.filter((cat) =>
        sources.some((s) => s.categories.includes(cat)),
      ),
    [sources],
  );

  useEffect(() => {
    if (category !== 'all' && !visibleCategories.includes(category)) {
      setCategory('all');
    }
  }, [category, visibleCategories]);

  function openConfigure(source: PublicSource) {
    setConfigureSource(source);
  }

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-6 xl:flex-row xl:items-stretch">
        <div className="min-w-0 flex-1 space-y-6 overflow-x-clip">
          <div className="flex flex-row flex-wrap items-center gap-3">
            <Tabs
              selectedKey={category}
              onSelectionChange={(key) => {
                const next = String(key);
                if (
                  next === 'all' ||
                  SOURCE_CATEGORIES.includes(next as ProviderCategory)
                ) {
                  setCategory(next as CategoryFilter);
                }
              }}
              className="w-fit"
            >
              <Tabs.ListContainer>
                <Tabs.List aria-label={t('sources.filter.aria')}>
                  <Tabs.Tab id="all">
                    {t('sources.filter.all')}
                    <Tabs.Indicator />
                  </Tabs.Tab>
                  {visibleCategories.map((cat) => (
                    <Tabs.Tab key={cat} id={cat}>
                      {t(`sources.category.${cat}`)}
                      <Tabs.Indicator />
                    </Tabs.Tab>
                  ))}
                </Tabs.List>
              </Tabs.ListContainer>
            </Tabs>

            <label className="relative block min-w-0 flex-1">
              <span className="sr-only">{t('sources.search.label')}</span>
              <Search
                className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-[var(--muted)]"
                aria-hidden
              />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={t('sources.search.placeholder')}
                className="w-full ps-9"
              />
            </label>
          </div>

          {isLoading ? <LoadingState label={t('sources.loading')} /> : null}

          {isError ? (
            <ErrorState
              message={t('sources.loadError')}
              retryLabel={t('common:state.retry')}
              onRetry={() => {
                void refetch();
              }}
            />
          ) : null}

          {!isLoading && !isError && sources.length === 0 ? (
            <EmptyState
              title={t('sources.emptyTitle')}
              description={t('sources.emptyBody')}
            />
          ) : null}

          {!isError && filtered.length === 0 && sources.length > 0 ? (
            <EmptyState
              title={t('sources.emptyFilterTitle')}
              description={t('sources.emptyFilterBody')}
            />
          ) : null}

          {!isError && filtered.length > 0 ? (
            <div className="space-y-6">
              {isFetching && !isLoading ? (
                <LoadingState label={t('sources.refreshing')} />
              ) : null}

              {grouped.map((group) => (
                <div key={group.category} className="space-y-3">
                  <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--foreground)]">
                    {t(`sources.category.${group.category}`)}
                  </h2>
                  <div className="grid gap-4 sm:grid-cols-1 xl:grid-cols-4">
                    {group.items.map((source) => (
                      <SourceCatalogCard
                        key={source.id}
                        source={source}
                        onConfigure={openConfigure}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : null}
        </div>

        {/*
          Same rail width as Overview What’s New (340px). On xl, absolute fill
          matches the catalog column height.
        */}
        <aside className="relative z-10 w-full shrink-0 xl:h-[calc(100dvh-8.25rem)] xl:w-[340px]">
          <div className="xl:absolute xl:inset-0 xl:flex xl:min-h-0">
            <ConnectedSourcesPanel
              sources={connectedSources}
              onConfigure={openConfigure}
            />
          </div>
        </aside>
      </div>

      {configureSource?.id === 'publicmetadb' ? (
        <PublicMetaDBConfigureModal
          source={configureSource}
          isOpen={configureSource !== null}
          onOpenChange={(open) => {
            if (!open) setConfigureSource(null);
          }}
        />
      ) : (
        <SourceConfigureModal
          source={configureSource}
          isOpen={configureSource !== null}
          onOpenChange={(open) => {
            if (!open) setConfigureSource(null);
          }}
        />
      )}
    </section>
  );
}
