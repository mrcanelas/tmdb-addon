import { useTranslation } from 'react-i18next';
import { Button, Card, Chip } from '@metalayer/shared-ui';
import type { PublicSource } from '@/lib/api';
import { sourceDescriptionKey } from '@/lib/source-presentation';
import { connectionChipColor } from '@/lib/source-filters';
import { SourceProviderIcon } from '@/components/sources/SourceProviderIcon';

export function SourceCatalogCard({
  source,
  onConfigure,
}: {
  source: PublicSource;
  onConfigure: (source: PublicSource) => void;
}) {
  const { t } = useTranslation('sources');
  const comingSoon = source.connectionState === 'coming_soon';
  const connected = source.connectionState === 'connected';
  const descriptionKey = sourceDescriptionKey(source.id);
  const description = t(descriptionKey, { defaultValue: '' });

  return (
    <Card className="relative flex h-full flex-col overflow-hidden">
      {source.adapterAvailable && !comingSoon ? (
        <span className="pointer-events-none absolute end-0 top-0 z-10 origin-top-right translate-x-[28%] translate-y-[40%] rotate-45 bg-[var(--accent)] px-8 py-0.5 text-[10px] font-semibold tracking-wide text-[var(--accent-foreground)]">
          {t('sources.badge.ready')}
        </span>
      ) : null}

      <Card.Content className="flex flex-1 flex-col items-center gap-3 pt-6 text-center">
        <SourceProviderIcon providerId={source.id} name={source.name} size="lg" />

        <div className="min-w-0 space-y-1.5">
          <Card.Title className="text-base sm:text-lg">{source.name}</Card.Title>
          {description ? (
            <p className="text-xs sm:text-sm leading-relaxed ml-text-muted">
              {description}
            </p>
          ) : null}
        </div>

        <div className="flex flex-wrap justify-center gap-1.5">
          {source.categories.slice(0, 2).map((category) => (
            <Chip key={category} size="sm" variant="soft" color="accent">
              {t(`sources.category.${category}`)}
            </Chip>
          ))}
          <Chip
            size="sm"
            variant="soft"
            color={connectionChipColor(source.connectionState)}
          >
            {t(`sources.state.${source.connectionState}`)}
          </Chip>
        </div>
      </Card.Content>

      <Card.Footer className="justify-center">
        <Button
          type="button"
          variant={connected ? 'primary' : 'secondary'}
          fullWidth
          isDisabled={comingSoon}
          onPress={() => onConfigure(source)}
        >
          {comingSoon
            ? t('sources.state.coming_soon')
            : connected
              ? t('sources.state.connected')
              : t('sources.actions.configure')}
        </Button>
      </Card.Footer>
    </Card>
  );
}
