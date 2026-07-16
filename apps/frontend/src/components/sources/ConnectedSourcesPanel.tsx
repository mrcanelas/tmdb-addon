import { useTranslation } from 'react-i18next';
import { Card, Chip, ScrollShadow } from '@metalayer/shared-ui';
import type { PublicSource } from '@/lib/api';
import { SourceListRow } from '@/components/sources/SourceListRow';

export function ConnectedSourcesPanel({
  sources,
  onConfigure,
}: {
  sources: PublicSource[];
  onConfigure: (source: PublicSource) => void;
}) {
  const { t } = useTranslation('sources');
  const empty = sources.length === 0;

  return (
    <Card className="flex h-full min-h-0 w-full flex-col">
      <Card.Header className="flex shrink-0 flex-row flex-wrap items-center justify-between gap-2">
        <Card.Title>{t('sources.connected.panelTitle')}</Card.Title>
        <Chip size="sm" variant="soft" color="accent">
          {sources.length}
        </Chip>
      </Card.Header>
      <Card.Content className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden p-0">
        {empty ? (
          <div className="space-y-1 px-4 py-3">
            <p className="text-sm font-medium text-[var(--foreground)]">
              {t('sources.emptyConnectedTitle')}
            </p>
            <p className="text-sm ml-text-muted">
              {t('sources.emptyConnectedBody')}
            </p>
          </div>
        ) : (
          <ScrollShadow
            className="min-h-0 flex-1"
            orientation="vertical"
            size={40}
          >
            <div className="pe-1">
              {sources.map((source) => (
                <SourceListRow
                  key={source.id}
                  source={source}
                  onConfigure={onConfigure}
                />
              ))}
            </div>
          </ScrollShadow>
        )}
      </Card.Content>
      <Card.Footer className="shrink-0">
        <p className="text-xs ml-text-muted">{t('sources.connected.panelHint')}</p>
      </Card.Footer>
    </Card>
  );
}
