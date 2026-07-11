import { useTranslation } from 'react-i18next';
import { listProviders } from '@metalayer/providers';
import { SourceCard } from '@/components/sources/SourceCard';

export function SourcesPage() {
  const { t } = useTranslation('sources');
  const providers = listProviders();

  return (
    <section className="space-y-6">
      <header className="space-y-2">
        <h1 className="font-display text-3xl font-semibold tracking-tight">
          {t('sources.title')}
        </h1>
        <p className="max-w-2xl text-muted-foreground">{t('sources.intro')}</p>
        <p className="max-w-2xl text-sm text-muted-foreground">{t('sources.unavailableHint')}</p>
      </header>

      <div className="grid gap-4">
        {providers.map((provider) => (
          <SourceCard key={provider.id} provider={provider} />
        ))}
      </div>
    </section>
  );
}
