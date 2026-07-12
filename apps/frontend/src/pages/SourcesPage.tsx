import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { SourceCard } from '@/components/sources/SourceCard';
import { fetchSources, type PublicSource } from '@/lib/api';

export function SourcesPage() {
  const { t } = useTranslation('sources');
  const [sources, setSources] = useState<PublicSource[]>([]);
  const [loadError, setLoadError] = useState(false);
  const [loading, setLoading] = useState(true);

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
      } finally {
        if (!cancelled) setLoading(false);
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
        {loading ? (
          <p className="text-sm text-muted-foreground">{t('sources.loading')}</p>
        ) : null}
        {loadError ? (
          <p className="text-sm text-amber-700 dark:text-amber-400">
            {t('sources.loadError')}
          </p>
        ) : null}
      </header>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {sources.map((source) => (
          <SourceCard key={source.id} source={source} />
        ))}
      </div>
    </section>
  );
}
