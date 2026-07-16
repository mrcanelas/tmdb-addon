import { useState } from 'react';
import { sourceIconUrl } from '@/lib/source-presentation';

export function SourceProviderIcon({
  providerId,
  name,
  size = 'md',
}: {
  providerId: string;
  name: string;
  size?: 'sm' | 'md' | 'lg';
}) {
  const iconUrl = sourceIconUrl(providerId);
  const [failed, setFailed] = useState(false);
  const showImage = Boolean(iconUrl) && !failed;

  const box =
    size === 'lg'
      ? 'size-14'
      : size === 'sm'
        ? 'size-9'
        : 'size-12';
  const letter =
    size === 'lg'
      ? 'text-lg'
      : size === 'sm'
        ? 'text-xs'
        : 'text-sm';

  return (
    <span
      className={`flex ${box} shrink-0 items-center justify-center overflow-hidden rounded-xl ${!showImage && "bg-[var(--default)] text-[var(--muted-foreground)]"}`}
      aria-hidden={!showImage}
    >
      {showImage ? (
        <img
          src={iconUrl}
          alt=""
          className="size-full object-cover"
          loading="lazy"
          decoding="async"
          onError={() => setFailed(true)}
        />
      ) : (
        <span
          className={`${letter} font-semibold text-[var(--foreground)]`}
          aria-hidden
        >
          {name.slice(0, 1).toUpperCase()}
        </span>
      )}
      {!showImage ? <span className="sr-only">{name}</span> : null}
    </span>
  );
}
