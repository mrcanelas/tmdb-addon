import { useTranslation } from 'react-i18next';
import type { ProviderDefinition } from '@metalayer/providers';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface SourceCardProps {
  provider: ProviderDefinition;
}

export function SourceCard({ provider }: SourceCardProps) {
  const { t } = useTranslation('sources');
  const disabled = provider.connectionState === 'coming_soon';

  const capabilityLabels = [
    provider.capabilities.supportsLanguage ? t('sources.capability.language') : null,
    provider.capabilities.supportsRegion ? t('sources.capability.region') : null,
    provider.capabilities.supportsOAuth ? t('sources.capability.oauth') : null,
    provider.capabilities.supportsTracking ? t('sources.capability.tracking') : null,
    provider.capabilities.supportsSearch ? t('sources.capability.search') : null,
  ].filter(Boolean) as string[];

  return (
    <article className="rounded-lg border border-border bg-card/80 p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold tracking-tight">{provider.name}</h2>
          <div className="flex flex-wrap gap-1.5">
            {provider.categories.map((category) => (
              <Badge key={category} variant="outline">
                {t(`sources.category.${category}`)}
              </Badge>
            ))}
          </div>
        </div>
        <Badge variant={disabled ? 'muted' : 'secondary'}>
          {t(`sources.state.${provider.connectionState}`)}
        </Badge>
      </div>

      {capabilityLabels.length > 0 ? (
        <ul className="mt-3 flex flex-wrap gap-1.5">
          {capabilityLabels.map((label) => (
            <li key={label}>
              <Badge variant="muted">{label}</Badge>
            </li>
          ))}
        </ul>
      ) : null}

      <div className="mt-4 flex flex-wrap gap-2">
        <Button type="button" size="sm" disabled>
          {provider.requiresOAuth || provider.requiresCredential
            ? t('sources.actions.connect')
            : t('sources.actions.test')}
        </Button>
        <Button type="button" size="sm" variant="outline" disabled>
          {t('sources.actions.test')}
        </Button>
        <Button type="button" size="sm" variant="ghost" disabled>
          {t('sources.actions.disconnect')}
        </Button>
      </div>
    </article>
  );
}
