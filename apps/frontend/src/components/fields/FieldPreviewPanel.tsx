import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { ExternalLink, X } from 'lucide-react';
import { Button } from '@metalayer/shared-ui';
import type { ResolutionTestResult } from '@/lib/api';
import {
  buildPreviewMeta,
  type FieldPreviewMeta,
} from '@/lib/field-preview-samples';
import { sourceLabel } from '@/lib/source-presentation';
import { MetaPreview } from './MetaPreview';

export function FieldPreviewPanel({
  fieldId,
  fieldLabel,
  error,
  result,
  results,
  meta: metaOverride,
  onClose,
}: {
  fieldId?: string;
  fieldLabel: string;
  error: string | null;
  /** Provenance for the field currently being edited. */
  result: ResolutionTestResult | null;
  /** Accumulated resolutions so previous field edits stay visible. */
  results?: ResolutionTestResult[];
  meta?: FieldPreviewMeta;
  onClose?: () => void;
}) {
  const { t } = useTranslation(['resolution', 'common']);
  const navigate = useNavigate();

  const meta = useMemo(() => {
    if (metaOverride) return metaOverride;
    return buildPreviewMeta(results ?? (result ? [result] : []), fieldId);
  }, [metaOverride, results, result, fieldId]);

  const sourceLine =
    result?.selectedProvider != null
      ? `${sourceLabel(result.selectedProvider)}${
          result.selectedLocale ? ` · ${result.selectedLocale}` : ''
        }`
      : null;

  return (
    <div className="relative flex h-full min-h-[28rem] w-full flex-col xl:min-h-0">
      {onClose ? (
        <button
          type="button"
          className="absolute end-2 top-2 z-20 rounded-md bg-black/40 p-1.5 text-white/80 backdrop-blur-sm transition-colors hover:bg-black/60 hover:text-white"
          aria-label={t('resolution.preview.close')}
          onClick={onClose}
        >
          <X className="size-4" aria-hidden />
        </button>
      ) : null}

      <MetaPreview
        meta={meta}
        highlightField={fieldId ?? result?.field}
        className="min-h-[28rem] xl:min-h-0"
        footer={
          <div className="space-y-2">
            {error ? (
              <p className="text-xs text-red-300" role="alert">
                {error}
              </p>
            ) : null}
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-white/70">
              <span className="truncate">
                {t('resolution.preview.fieldLabel', { field: fieldLabel })}
              </span>
              {sourceLine ? (
                <span className="truncate font-medium text-white/90">
                  {sourceLine}
                  {result?.fallbackUsed
                    ? ` · ${t('resolution.preview.fallbackUsed')}`
                    : ''}
                </span>
              ) : (
                <span>{t('resolution.preview.empty')}</span>
              )}
            </div>
            {result?.temporary ? (
              <p className="text-[11px] text-white/50" role="status">
                {t('resolution.preview.temporaryHint')}
              </p>
            ) : null}
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="w-full"
              onPress={() => navigate('/review/inspector')}
            >
              <ExternalLink className="size-3.5" aria-hidden />
              {t('resolution.preview.openInspector')}
            </Button>
          </div>
        }
      />
    </div>
  );
}
