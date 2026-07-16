import { useTranslation } from 'react-i18next';
import { Button, Chip } from '@metalayer/shared-ui';
import type { PublicSource } from '@/lib/api';
import { connectionChipColor } from '@/lib/source-filters';
import { SourceProviderIcon } from '@/components/sources/SourceProviderIcon';

export function SourceListRow({
  source,
  onConfigure,
}: {
  source: PublicSource;
  onConfigure: (source: PublicSource) => void;
}) {
  const { t } = useTranslation('sources');

  return (
    <div className="flex items-center gap-3 border-b border-[var(--border)] px-3 py-3 last:border-b-0">
      <SourceProviderIcon providerId={source.id} name={source.name} size="sm" />
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium text-[var(--foreground)]">
          {source.name}
        </p>
        <div className="mt-1 flex flex-wrap items-center gap-1.5">
          <Chip
            size="sm"
            variant="soft"
            color={connectionChipColor(source.connectionState)}
          >
            {t(`sources.state.${source.connectionState}`)}
          </Chip>
        </div>
      </div>
      <Button
        type="button"
        size="sm"
        variant="ghost"
        onPress={() => onConfigure(source)}
      >
        {t('sources.actions.configure')}
      </Button>
    </div>
  );
}
