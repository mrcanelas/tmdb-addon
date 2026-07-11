import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { listAdapterProviderIds, listProviders } from '@metalayer/providers';
import { SourceCard } from '@/components/sources/SourceCard';
import {
  fetchSources,
  toPublicSource,
  type PublicSource,
} from '@/lib/api';

export function SourcesPage() {
  const { t } = useTranslation('sources');
  const [sources, setSources] = useState<PublicSource[]>(() =>
    listProviders().map((provider) =>
      toPublicSource(provider, listAdapterProviderIds().includes(provider.id)),
    ),
  );
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const remote = await fetchSources();
        if (!cancelled) {
          setSources(remote);
          setLoadError(false);
        }
      } catch {
        if (!cancelled) setLoadError(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section className="space-y-6">
      <header className="space-y-2">
        <h1 className="font-display text-3xl font-semibold tracking-tight">
          {t('sources.title')}
        </h1>
        <p className="max-w-2xl text-muted-foreground">{t('sources.intro')}</p>
        <p className="max-w-2xl text-sm text-muted-foreground">{t('sources.unavailableHint')}</p>
        {loadError ? (
          <p className="max-w-2xl text-sm text-amber-700 dark:text-amber-400" role="status">
            {t('sources.loadError')}
          </p>
        ) : null}
      </header>

      <div className="grid gap-4">
        {sources.map((source) => (
          <SourceCard key={source.id} source={source} />
        ))}
      </div>
    </section>
  );
}
