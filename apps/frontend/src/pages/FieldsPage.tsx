import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import type { FieldResolutionPlan, ResolutionConfig } from '@metalayer/config';
import { Button, toast } from '@metalayer/shared-ui';
import { ChevronLeft, ChevronRight, RotateCcw } from 'lucide-react';
import {
  ensureStudioSession,
  fetchResolutionConfig,
  saveResolutionConfig,
  testResolutionPlan,
  type ResolutionTestResult,
} from '@/lib/api';
import {
  ensureFieldPlan,
  resetFieldPlan,
  EDITABLE_FIELD_IDS,
  type EditableFieldId,
} from '@/lib/field-plans';
import {
  adjacentEditableField,
  getFieldEntry,
  isEditableFieldId,
  isResolutionFieldId,
  isSettingsFieldId,
  parseFieldQueryParam,
  type FieldRailId,
} from '@/lib/field-registry';
import {
  buildPreviewMeta,
  FIELD_PREVIEW_CONTRIBUTIONS,
  FIELD_PREVIEW_SAMPLE,
} from '@/lib/field-preview-samples';
import { usePageHeader } from '@/contexts/page-title';
import { LoadingState } from '@/components/metalayer/LoadingState';
import { ErrorState } from '@/components/metalayer/ErrorState';
import { FieldPreviewPanel } from '@/components/fields/FieldPreviewPanel';
import { ResolutionChainBuilder } from '@/components/fields/ResolutionChainBuilder';
import { LanguageRegionEditor } from '@/components/fields/LanguageRegionEditor';
import { AppearanceEditor } from '@/components/fields/AppearanceEditor';
import { cn } from '@/lib/utils';

export function FieldsPage() {
  const { t } = useTranslation(['resolution', 'common']);
  usePageHeader(t('resolution.pageTitle'), t('resolution.intro'));
  const [searchParams, setSearchParams] = useSearchParams();

  const selectedId = parseFieldQueryParam(searchParams.get('field'));
  const selectedEntry = getFieldEntry(selectedId);
  const isSettings = isSettingsFieldId(selectedId);
  const editableSelected = isResolutionFieldId(selectedId)
    ? (selectedId as EditableFieldId)
    : null;

  const [resolution, setResolution] = useState<ResolutionConfig | null>(null);
  const [baseline, setBaseline] = useState<ResolutionConfig | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [saving, setSaving] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(true);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [previewByField, setPreviewByField] = useState<
    Partial<Record<EditableFieldId, ResolutionTestResult>>
  >({});
  const previewGenerationRef = useRef<
    Partial<Record<EditableFieldId, number>>
  >({});

  const currentPlan = useMemo(() => {
    if (!resolution || !editableSelected) return null;
    return ensureFieldPlan(resolution, editableSelected);
  }, [resolution, editableSelected]);

  const previewResults = useMemo(
    () => Object.values(previewByField).filter(Boolean) as ResolutionTestResult[],
    [previewByField],
  );

  const previewMeta = useMemo(
    () => buildPreviewMeta(previewResults, editableSelected ?? selectedId),
    [previewResults, editableSelected, selectedId],
  );

  const previewResult = editableSelected
    ? (previewByField[editableSelected] ?? null)
    : null;

  const isDirty = useMemo(() => {
    if (!resolution || !baseline) return false;
    return JSON.stringify(resolution) !== JSON.stringify(baseline);
  }, [resolution, baseline]);

  const selectField = useCallback(
    (id: FieldRailId) => {
      const next = new URLSearchParams(searchParams);
      next.set('field', id);
      setSearchParams(next, { replace: true });
    },
    [searchParams, setSearchParams],
  );

  const load = useCallback(async () => {
    setStatus('loading');
    try {
      const session = await ensureStudioSession();
      const result = await fetchResolutionConfig(
        session.configId,
        session.editCredential,
      );
      const next: ResolutionConfig = {
        ...result.resolution,
        defaults: {
          fields: { ...result.resolution.defaults.fields },
        },
      };
      for (const entry of [
        'title',
        'originalTitle',
        'description',
        'poster',
        'background',
        'logo',
        'rating',
        'voteCount',
        'releaseDate',
        'externalIds',
      ] as const) {
        next.defaults.fields[entry] = ensureFieldPlan(next, entry);
      }
      setResolution(next);
      setBaseline(structuredClone(next));
      setStatus('ready');
    } catch {
      setStatus('error');
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!searchParams.get('field')) {
      const next = new URLSearchParams(searchParams);
      next.set('field', selectedId);
      setSearchParams(next, { replace: true });
    }
  }, [searchParams, selectedId, setSearchParams]);

  const runPreview = useCallback(
    async (field: EditableFieldId, plan: FieldResolutionPlan) => {
      const generation = (previewGenerationRef.current[field] ?? 0) + 1;
      previewGenerationRef.current[field] = generation;
      try {
        const session = await ensureStudioSession();
        const result = await testResolutionPlan(
          session.configId,
          session.editCredential,
          {
            field,
            mediaType: FIELD_PREVIEW_SAMPLE.mediaType,
            originalLanguage: FIELD_PREVIEW_SAMPLE.originalLanguage,
            contributions: FIELD_PREVIEW_CONTRIBUTIONS[field] ?? [],
            plan,
          },
        );
        if (previewGenerationRef.current[field] !== generation) return;
        setPreviewByField((current) => ({ ...current, [field]: result }));
        setPreviewError((current) =>
          field === editableSelected ? null : current,
        );
      } catch {
        if (previewGenerationRef.current[field] !== generation) return;
        setPreviewError((current) =>
          field === editableSelected
            ? t('resolution.preview.error')
            : current,
        );
      }
    },
    [editableSelected, t],
  );

  // Warm every sample-backed field once so the composed preview is complete.
  useEffect(() => {
    if (status !== 'ready' || !resolution) return;
    let cancelled = false;
    void (async () => {
      const fields = EDITABLE_FIELD_IDS.filter(
        (field) => FIELD_PREVIEW_CONTRIBUTIONS[field],
      );
      await Promise.all(
        fields.map(async (field) => {
          if (cancelled) return;
          await runPreview(field, ensureFieldPlan(resolution, field));
        }),
      );
    })();
    return () => {
      cancelled = true;
    };
    // Intentionally only when the page first becomes ready — later edits
    // are handled by the per-field debounce below.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- warm once per ready
  }, [status]);

  // Silently refresh the field being edited when its plan changes.
  useEffect(() => {
    if (!editableSelected || !currentPlan) return;
    const handle = window.setTimeout(() => {
      void runPreview(editableSelected, currentPlan);
    }, 280);
    return () => window.clearTimeout(handle);
  }, [editableSelected, currentPlan, runPreview]);

  function updateField(field: EditableFieldId, plan: FieldResolutionPlan) {
    setResolution((current) => {
      if (!current) return current;
      return {
        ...current,
        defaults: {
          ...current.defaults,
          fields: {
            ...current.defaults.fields,
            [field]: plan,
          },
        },
      };
    });
  }

  async function onSave() {
    if (!resolution) return;
    setSaving(true);
    try {
      const session = await ensureStudioSession();
      const saved = await saveResolutionConfig(
        session.configId,
        session.editCredential,
        resolution,
      );
      setResolution(saved.resolution);
      setBaseline(structuredClone(saved.resolution));
      toast.success(t('resolution.saveOk'));
    } catch {
      toast.danger(t('resolution.saveError'));
    } finally {
      setSaving(false);
    }
  }

  function onResetField() {
    if (!editableSelected) return;
    updateField(editableSelected, resetFieldPlan(editableSelected));
  }

  const previousId = adjacentEditableField(selectedId, -1);
  const nextId = adjacentEditableField(selectedId, 1);

  if (isSettings) {
    return (
      <section className="space-y-4">
        <div className="mb-1 flex flex-wrap items-center justify-between gap-2 xl:hidden">
          <Button
            type="button"
            size="sm"
            variant="outline"
            isDisabled={!previousId}
            onPress={() => previousId && selectField(previousId)}
          >
            <ChevronLeft className="size-4" aria-hidden />
            {t('resolution.nav.previous')}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            isDisabled={!nextId}
            onPress={() => nextId && selectField(nextId)}
          >
            {t('resolution.nav.next')}
            <ChevronRight className="size-4" aria-hidden />
          </Button>
        </div>
        {selectedId === 'language' ? <LanguageRegionEditor /> : null}
        {selectedId === 'appearance' ? <AppearanceEditor /> : null}
      </section>
    );
  }

  return (
    <section className="space-y-4">
      {status === 'loading' ? (
        <LoadingState label={t('resolution.loading')} />
      ) : null}

      {status === 'error' ? (
        <ErrorState
          message={t('resolution.loadError')}
          retryLabel={t('common:state.retry')}
          onRetry={() => {
            void load();
          }}
        />
      ) : null}

      {status === 'ready' && resolution ? (
        <div className="flex flex-col gap-4 xl:h-[calc(100dvh-8.25rem)] xl:flex-row xl:items-stretch">
          <div className="min-w-0 flex-1">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2 xl:hidden">
              <Button
                type="button"
                size="sm"
                variant="outline"
                isDisabled={!previousId}
                onPress={() => previousId && selectField(previousId)}
              >
                <ChevronLeft className="size-4" aria-hidden />
                {t('resolution.nav.previous')}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onPress={() => setPreviewOpen((open) => !open)}
              >
                {previewOpen
                  ? t('resolution.preview.hide')
                  : t('resolution.preview.show')}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                isDisabled={!nextId}
                onPress={() => nextId && selectField(nextId)}
              >
                {t('resolution.nav.next')}
                <ChevronRight className="size-4" aria-hidden />
              </Button>
            </div>

            {editableSelected && currentPlan && selectedEntry ? (
              <div className="xl:h-full">
                <ResolutionChainBuilder
                  fieldLabel={t(`resolution.field.${editableSelected}`)}
                  fieldDescription={t(
                    `resolution.fieldDescription.${editableSelected}`,
                    {
                      defaultValue: t('resolution.builderIntro'),
                    },
                  )}
                  value={currentPlan}
                  onChange={(plan) => updateField(editableSelected, plan)}
                  providerOptions={selectedEntry.providerOptions}
                  allowLocales={selectedEntry.allowLocales}
                  footer={
                    <>
                      <div className="flex flex-wrap items-center gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          onPress={onResetField}
                        >
                          <RotateCcw className="size-4" aria-hidden />
                          {t('resolution.resetField')}
                        </Button>
                        <div className="hidden items-center gap-1 xl:flex">
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            isIconOnly
                            isDisabled={!previousId}
                            aria-label={t('resolution.nav.previous')}
                            onPress={() =>
                              previousId && selectField(previousId)
                            }
                          >
                            <ChevronLeft className="size-4" aria-hidden />
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            isIconOnly
                            isDisabled={!nextId}
                            aria-label={t('resolution.nav.next')}
                            onPress={() => nextId && selectField(nextId)}
                          >
                            <ChevronRight className="size-4" aria-hidden />
                          </Button>
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="primary"
                        isDisabled={saving || !isDirty}
                        onPress={() => {
                          void onSave();
                        }}
                      >
                        {saving
                          ? t('resolution.saving')
                          : t('resolution.saveChanges')}
                      </Button>
                    </>
                  }
                />
              </div>
            ) : (
              <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6">
                <p className="text-sm ml-text-muted">
                  {isEditableFieldId(selectedId)
                    ? t('resolution.rail.selectHint')
                    : t('resolution.rail.comingSoonHint', {
                        field: t(`resolution.field.${selectedId}`),
                      })}
                </p>
              </div>
            )}
          </div>

          <div
            className={cn(
              'w-full shrink-0 xl:w-[340px]',
              !previewOpen && 'hidden xl:block',
            )}
          >
            <div className="xl:h-full">
              <FieldPreviewPanel
                fieldId={selectedId}
                fieldLabel={t(`resolution.field.${selectedId}`)}
                error={previewError}
                result={previewResult}
                results={previewResults}
                meta={previewMeta}
                onClose={
                  previewOpen ? () => setPreviewOpen(false) : undefined
                }
              />
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
