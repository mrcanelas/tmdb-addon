import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Film, ImageOff } from 'lucide-react';
import { Card, Chip } from '@metalayer/shared-ui';
import type { CatalogMetaPreview } from '@/lib/api';

export function CatalogTitleCard({ meta }: { meta: CatalogMetaPreview }) {
  const { t } = useTranslation('catalogs');
  const [posterFailed, setPosterFailed] = useState(false);
  const showPoster = Boolean(meta.poster) && !posterFailed;

  return (
    <Card className="flex h-full rounded-none p-0 flex-col gap-0 overflow-hidden shadow-none">
      <div className="relative aspect-[2/3] w-full shrink-0 overflow-hidden rounded-md bg-[var(--default)]">
        {showPoster ? (
          <img
            src={meta.poster}
            alt=""
            className="absolute inset-0 size-full object-cover object-center"
            loading="lazy"
            onError={() => setPosterFailed(true)}
          />
        ) : (
          <div
            className="flex size-full flex-col items-center justify-center gap-2 text-[var(--muted-foreground)]"
            aria-label={t('catalogs.titleCard.noPoster')}
          >
            <ImageOff className="size-8 opacity-50" aria-hidden />
            <Film className="size-5 opacity-40" aria-hidden />
          </div>
        )}
      </div>
      <Card.Content className="flex flex-1 flex-col gap-0">
        <Card.Title className="line-clamp-2 text-sm text-nowrap">
          {meta.name}
        </Card.Title>
        <div className="mt-auto flex flex-wrap items-center gap-1">
          {meta.releaseInfo ? (
            <span className="text-xs ml-text-muted">{new Date(meta.releaseInfo).getFullYear()}</span>
          ) : null}
        </div>
      </Card.Content>
    </Card>
  );
}
