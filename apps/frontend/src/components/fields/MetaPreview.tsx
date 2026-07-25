import { useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Clapperboard,
  Eye,
  Library,
  Play,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { FieldPreviewMeta } from '@/lib/field-preview-samples';

function MetaLinkGroup({
  label,
  items,
}: {
  label: string;
  items: string[];
}) {
  if (items.length === 0) return null;
  return (
    <div className="mt-4">
      <p className="mb-2 text-[0.7rem] font-bold uppercase tracking-wide text-white/40">
        {label}
      </p>
      <ul className="flex flex-wrap gap-1.5">
        {items.map((item) => (
          <li key={item}>
            <span className="inline-flex max-w-full truncate rounded-full bg-white/10 px-2.5 py-1 text-xs font-medium text-white/90">
              {item}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function PreviewAction({
  label,
  children,
  wide,
}: {
  label: string;
  children: ReactNode;
  wide?: boolean;
}) {
  return (
    <button
      type="button"
      tabIndex={-1}
      aria-label={label}
      className={cn(
        'inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-full bg-black/45 text-white backdrop-blur-sm transition-colors hover:bg-black/60',
        wide ? 'px-5 text-sm font-semibold' : 'size-10',
      )}
    >
      {children}
      {wide ? <span>{label}</span> : null}
    </button>
  );
}

/**
 * Stremio-like meta detail preview for Metas → Fields.
 * Independently implemented to mirror public Stremio UX (logo, backdrop,
 * runtime/year/IMDb, overview, link pills, action bar). Does not reuse
 * stremio-web source (GPLv2).
 */
export function MetaPreview({
  meta,
  className,
  footer,
  highlightField,
}: {
  meta: FieldPreviewMeta;
  className?: string;
  footer?: ReactNode;
  /** Field currently being edited — used for subtle emphasis. */
  highlightField?: string;
}) {
  const { t } = useTranslation('resolution');
  const [logoFailed, setLogoFailed] = useState(false);
  const [bgFailed, setBgFailed] = useState(false);

  // Editing a title field must show the resolved text, not the logo artwork.
  const editingTitle =
    highlightField === 'title' || highlightField === 'originalTitle';
  const showLogo = Boolean(meta.logo) && !logoFailed && !editingTitle;
  const showBackground = Boolean(meta.background) && !bgFailed;

  return (
    <div
      className={cn(
        'relative flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border border-[var(--border)] bg-[#0b0d12] text-white',
        className,
      )}
    >
      {showBackground ? (
        <div
          className="pointer-events-none absolute inset-[-10px] z-0"
          aria-hidden
        >
          <img
            src={meta.background}
            alt=""
            className="size-full object-cover object-center opacity-35 blur-[10px]"
            loading="lazy"
            decoding="async"
            onError={() => setBgFailed(true)}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/55 to-black/85" />
        </div>
      ) : null}

      <div className="relative z-10 flex min-h-0 flex-1 flex-col">
        <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-2 pt-5">
          {showLogo ? (
            <img
              src={meta.logo}
              alt=""
              className={cn(
                'mx-auto mb-5 block h-16 max-w-full object-contain object-center drop-shadow-md sm:h-20',
                highlightField === 'logo' &&
                  'ring-2 ring-[var(--accent)] ring-offset-2 ring-offset-transparent',
              )}
              loading="lazy"
              decoding="async"
              onError={() => setLogoFailed(true)}
            />
          ) : (
            <h2
              className={cn(
                'mb-5 text-balance text-center text-2xl font-bold leading-tight text-white/95',
                editingTitle &&
                  'underline decoration-[var(--accent)] decoration-2 underline-offset-4',
              )}
            >
              {meta.name}
            </h2>
          )}

          <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-sm font-semibold text-white/95">
            {meta.runtime ? <span>{meta.runtime}</span> : null}
            {meta.releaseInfo ? <span>{meta.releaseInfo}</span> : null}
            {meta.imdbRating ? (
              <span
                className={cn(
                  'inline-flex items-center gap-1.5',
                  highlightField === 'rating' && 'text-[var(--accent)]',
                )}
              >
                <span>{meta.imdbRating}</span>
                <span
                  className="inline-flex h-4 items-center rounded-[3px] bg-[#f5c518] px-1 text-[9px] font-black tracking-tight text-black"
                  aria-hidden
                >
                  IMDb
                </span>
              </span>
            ) : null}
          </div>

          {meta.description ? (
            <p className='mt-4 text-sm leading-relaxed text-white/90'>
              {meta.description}
            </p>
          ) : null}

          <MetaLinkGroup
            label={t('resolution.preview.genres')}
            items={meta.genres}
          />
          <MetaLinkGroup
            label={t('resolution.preview.cast')}
            items={meta.cast}
          />
          <MetaLinkGroup
            label={t('resolution.preview.directors')}
            items={meta.directors}
          />
        </div>
{/* 
        {footer ? (
          <div className="relative z-10 shrink-0 border-t border-white/10 bg-black/40 px-3 py-2 backdrop-blur-sm">
            {footer}
          </div>
        ) : null} */}
      </div>
    </div>
  );
}
