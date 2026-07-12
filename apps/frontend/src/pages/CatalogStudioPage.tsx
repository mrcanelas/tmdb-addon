import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  bootstrapCatalogDraft,
  clearCatalogSession,
  createStudioCatalog,
  exportStudioCatalogs,
  fetchCatalogs,
  importStudioCatalogs,
  mutateCatalog,
  previewCatalogResults,
  readCatalogSession,
  type CatalogListItem,
  type CatalogMetaPreview,
  type ManifestCatalogEntry,
  type StudioCatalogAction,
} from '@/lib/api';
import { Button } from '@metalayer/shared-ui';
import { Badge } from '@/components/ui/badge';
import { PageHeader } from '@/components/metalayer/PageHeader';
import { SectionCard } from '@/components/metalayer/SectionCard';
import { LoadingState } from '@/components/metalayer/LoadingState';
import { ErrorState } from '@/components/metalayer/ErrorState';
import { StudioPromptDialog } from '@/components/metalayer/StudioPromptDialog';

function displayName(catalog: CatalogListItem): string {
  return catalog.customName || catalog.name?.default || catalog.originalName;
}

type CatalogEditDialog =
  | { kind: 'rename'; catalogId: string; value: string }
  | { kind: 'tags'; catalogId: string; value: string }
  | { kind: 'group'; catalogId: string; value: string };

export function CatalogStudioPage() {
  const { t, i18n } = useTranslation(['catalogs', 'common']);
  const [catalogs, setCatalogs] = useState<CatalogListItem[]>([]);
  const [manifestOrder, setManifestOrder] = useState<ManifestCatalogEntry[]>([]);
  const [configId, setConfigId] = useState<string | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [previewMetas, setPreviewMetas] = useState<CatalogMetaPreview[]>([]);
  const [previewWarnings, setPreviewWarnings] = useState<string[]>([]);
  const [previewTitle, setPreviewTitle] = useState<string | null>(null);
  const [editDialog, setEditDialog] = useState<CatalogEditDialog | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const applyPayload = useCallback(
    (payload: {
      configId: string;
      catalogs: CatalogListItem[];
      manifestOrder: ManifestCatalogEntry[];
    }) => {
      setConfigId(payload.configId);
      setCatalogs(payload.catalogs);
      setManifestOrder(payload.manifestOrder);
      setStatus('ready');
    },
    [],
  );

  const load = useCallback(
    async (reset = false) => {
      setStatus('loading');
      try {
        if (reset) clearCatalogSession();
        const session = readCatalogSession();
        if (!session) {
          const draft = await bootstrapCatalogDraft();
          applyPayload(draft);
          return;
        }
        const listed = await fetchCatalogs(session.configId, session.editCredential, i18n.language);
        applyPayload({
          configId: listed.configId,
          catalogs: listed.catalogs,
          manifestOrder: listed.manifestOrder,
        });
      } catch {
        try {
          clearCatalogSession();
          const draft = await bootstrapCatalogDraft();
          applyPayload(draft);
        } catch {
          setStatus('error');
        }
      }
    },
    [applyPayload, i18n.language],
  );

  useEffect(() => {
    void load();
  }, [load]);

  async function runAction(
    instanceId: string,
    action: StudioCatalogAction,
    extra?: { customName?: string; toIndex?: number; tags?: string[]; group?: string | null },
  ) {
    const session = readCatalogSession();
    if (!session) return;
    setBusyId(instanceId);
    try {
      const result = await mutateCatalog(session.configId, session.editCredential, instanceId, {
        action,
        ...extra,
      });
      setCatalogs(result.catalogs);
      setManifestOrder(result.manifestOrder);
    } catch {
      setStatus('error');
    } finally {
      setBusyId(null);
    }
  }

  async function onPreview(catalog: CatalogListItem) {
    const session = readCatalogSession();
    if (!session) return;
    setBusyId(catalog.instanceId);
    setPreviewTitle(displayName(catalog));
    try {
      const result = await previewCatalogResults(
        session.configId,
        session.editCredential,
        catalog.instanceId,
        { locale: i18n.language },
      );
      setPreviewMetas(result.metas);
      setPreviewWarnings(result.warnings ?? []);
    } catch {
      setPreviewMetas([]);
      setPreviewWarnings([t('catalogs.previewError')]);
    } finally {
      setBusyId(null);
    }
  }

  async function onExport() {
    const session = readCatalogSession();
    if (!session) return;
    const exported = await exportStudioCatalogs(session.configId, session.editCredential);
    const blob = new Blob([JSON.stringify(exported.catalogs, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `metalayer-catalogs-${session.configId}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  async function onImportFile(file: File) {
    const session = readCatalogSession();
    if (!session) return;
    const text = await file.text();
    const parsed = JSON.parse(text) as unknown;
    const result = await importStudioCatalogs(
      session.configId,
      session.editCredential,
      parsed,
      'append',
    );
    applyPayload(result);
  }

  async function onCreateMerged() {
    const session = readCatalogSession();
    if (!session || catalogs.length < 2) return;
    const leafIds = catalogs
      .filter((catalog) => !catalog.merge && !catalog.rotation)
      .slice(0, 2)
      .map((catalog) => catalog.instanceId);
    if (leafIds.length < 2) return;
    const result = await createStudioCatalog(session.configId, session.editCredential, {
      action: 'createMerged',
      name: t('catalogs.mergedDefaultName'),
      mediaType: 'movie',
      mergeMode: 'dedupe-union',
      sourceInstanceIds: leafIds,
    });
    applyPayload(result);
  }

  async function onCreateRotated() {
    const session = readCatalogSession();
    if (!session || catalogs.length < 2) return;
    const leafIds = catalogs
      .filter((catalog) => !catalog.merge && !catalog.rotation)
      .slice(0, 2)
      .map((catalog) => catalog.instanceId);
    if (leafIds.length < 2) return;
    const result = await createStudioCatalog(session.configId, session.editCredential, {
      action: 'createRotated',
      name: t('catalogs.rotatedDefaultName'),
      mediaType: 'movie',
      rotationMode: 'daily',
      sourceInstanceIds: leafIds,
    });
    applyPayload(result);
  }

  function openEditDialog(
    kind: CatalogEditDialog['kind'],
    catalog: CatalogListItem,
  ) {
    if (kind === 'rename') {
      setEditDialog({
        kind,
        catalogId: catalog.instanceId,
        value: displayName(catalog),
      });
      return;
    }
    if (kind === 'tags') {
      setEditDialog({
        kind,
        catalogId: catalog.instanceId,
        value: catalog.tags.join(', '),
      });
      return;
    }
    setEditDialog({
      kind: 'group',
      catalogId: catalog.instanceId,
      value: catalog.group ?? '',
    });
  }

  async function submitEditDialog() {
    if (!editDialog) return;
    const { kind, catalogId, value } = editDialog;
    if (kind === 'rename') {
      const trimmed = value.trim();
      if (!trimmed) return;
      await runAction(catalogId, 'rename', { customName: trimmed });
    } else if (kind === 'tags') {
      await runAction(catalogId, 'setTags', {
        tags: value
          .split(',')
          .map((tag) => tag.trim())
          .filter(Boolean),
      });
    } else {
      await runAction(catalogId, 'setGroup', {
        group: value.trim() || null,
      });
    }
    setEditDialog(null);
  }

  const dialogTitle =
    editDialog?.kind === 'rename'
      ? t('catalogs.dialog.renameTitle')
      : editDialog?.kind === 'tags'
        ? t('catalogs.dialog.tagsTitle')
        : editDialog?.kind === 'group'
          ? t('catalogs.dialog.groupTitle')
          : '';

  const dialogLabel =
    editDialog?.kind === 'rename'
      ? t('catalogs.renamePrompt')
      : editDialog?.kind === 'tags'
        ? t('catalogs.tagsPrompt')
        : editDialog?.kind === 'group'
          ? t('catalogs.groupPrompt')
          : '';

  return (
    <section className="space-y-6">
      <PageHeader
        title={t('catalogs.title')}
        description={t('catalogs.intro')}
        actions={
          <>
            <Button type="button" variant="outline" size="sm" onPress={() => void load(true)}>
              {t('catalogs.actions.resetDraft')}
            </Button>
            <Button type="button" variant="outline" size="sm" onPress={() => void onExport()}>
              {t('catalogs.actions.export')}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onPress={() => fileInputRef.current?.click()}
            >
              {t('catalogs.actions.import')}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onPress={() => void onCreateMerged()}
            >
              {t('catalogs.actions.createMerged')}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onPress={() => void onCreateRotated()}
            >
              {t('catalogs.actions.createRotated')}
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept="application/json,.json"
              className="hidden"
              aria-label={t('catalogs.actions.importFileAria')}
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void onImportFile(file);
                event.target.value = '';
              }}
            />
          </>
        }
      />

      <p className="max-w-2xl text-sm ml-text-muted">{t('catalogs.syncHint')}</p>
      {configId ? (
        <p className="font-mono text-xs ml-text-muted">
          {t('catalogs.configId', { id: configId })}
        </p>
      ) : null}

      {status === 'loading' ? (
        <LoadingState label={t('catalogs.bootstrapping')} />
      ) : null}

      {status === 'error' ? (
        <ErrorState
          message={t('catalogs.loadError')}
          retryLabel={t('state.retry', { ns: 'common' })}
          onRetry={() => {
            void load();
          }}
        />
      ) : null}

      {status === 'ready' && catalogs.length === 0 ? (
        <p className="ml-text-muted">{t('catalogs.empty')}</p>
      ) : null}

      {status === 'ready' && catalogs.length > 0 ? (
        <div className="grid gap-8 lg:grid-cols-2">
          <SectionCard title={t('catalogs.studioList')}>
            <ol className="space-y-3">
              {catalogs.map((catalog, index) => {
                const busy = busyId === catalog.instanceId;
                const name = displayName(catalog);
                return (
                  <li
                    key={catalog.instanceId}
                    className="border-b border-[var(--ml-border)] pb-3 last:border-b-0"
                  >
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <div>
                        <p className="font-medium text-[var(--ml-text)]">
                          <span className="me-2 font-mono text-xs ml-text-muted">
                            {catalog.position + 1}.
                          </span>
                          {name}
                        </p>
                        <p className="mt-1 text-sm ml-text-muted">
                          {t('catalogs.field.provider')}: {catalog.provider}.
                          {catalog.providerCatalogId}
                          {catalog.group
                            ? ` · ${t('catalogs.field.group')}: ${catalog.group}`
                            : ''}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        <Badge variant="secondary">
                          {t(`catalogs.type.${catalog.mediaType}`)}
                        </Badge>
                        {catalog.merge ? (
                          <Badge variant="outline">{t('catalogs.badge.merged')}</Badge>
                        ) : null}
                        {catalog.rotation ? (
                          <Badge variant="outline">{t('catalogs.badge.rotated')}</Badge>
                        ) : null}
                        {catalog.tags.map((tag) => (
                          <Badge key={tag} variant="outline">
                            {tag}
                          </Badge>
                        ))}
                        {!catalog.enabled ? (
                          <Badge variant="outline">{t('catalogs.actions.disable')}</Badge>
                        ) : null}
                        {catalog.showInHome ? (
                          <Badge variant="outline">{t('catalogs.field.home')}</Badge>
                        ) : null}
                      </div>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        isDisabled={busy || index === 0}
                        aria-label={t('catalogs.actions.moveUpNamed', { name })}
                        onPress={() =>
                          void runAction(catalog.instanceId, 'move', { toIndex: index - 1 })
                        }
                      >
                        {t('catalogs.actions.moveUp')}
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        isDisabled={busy || index === catalogs.length - 1}
                        aria-label={t('catalogs.actions.moveDownNamed', { name })}
                        onPress={() =>
                          void runAction(catalog.instanceId, 'move', { toIndex: index + 1 })
                        }
                      >
                        {t('catalogs.actions.moveDown')}
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="quiet"
                        isDisabled={busy}
                        onPress={() => void onPreview(catalog)}
                      >
                        {t('catalogs.actions.preview')}
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="quiet"
                        isDisabled={busy}
                        onPress={() => openEditDialog('rename', catalog)}
                      >
                        {t('catalogs.actions.rename')}
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="quiet"
                        isDisabled={busy}
                        onPress={() => openEditDialog('tags', catalog)}
                      >
                        {t('catalogs.actions.tags')}
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="quiet"
                        isDisabled={busy}
                        onPress={() => openEditDialog('group', catalog)}
                      >
                        {t('catalogs.actions.group')}
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="quiet"
                        isDisabled={busy}
                        onPress={() => void runAction(catalog.instanceId, 'duplicate')}
                      >
                        {t('catalogs.actions.duplicate')}
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="quiet"
                        isDisabled={busy}
                        onPress={() =>
                          void runAction(
                            catalog.instanceId,
                            catalog.enabled ? 'disable' : 'enable',
                          )
                        }
                      >
                        {t(
                          catalog.enabled
                            ? 'catalogs.actions.disable'
                            : 'catalogs.actions.enable',
                        )}
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="quiet"
                        isDisabled={busy}
                        onPress={() => void runAction(catalog.instanceId, 'delete')}
                      >
                        {t('catalogs.actions.delete')}
                      </Button>
                    </div>
                  </li>
                );
              })}
            </ol>
          </SectionCard>

          <div className="space-y-6">
            <SectionCard title={t('catalogs.manifestPreview')}>
              <ol className="space-y-2 border-s border-[var(--ml-border)] ps-4">
                {manifestOrder.map((entry, index) => (
                  <li key={entry.instanceId} className="text-sm text-[var(--ml-text)]">
                    <span className="me-2 font-mono text-xs ml-text-muted">
                      {index + 1}.
                    </span>
                    <span className="font-medium">{entry.name}</span>
                    <span className="ms-2 ml-text-muted">
                      ({t(`catalogs.type.${entry.type}`)})
                    </span>
                  </li>
                ))}
              </ol>
            </SectionCard>

            <SectionCard
              title={
                previewTitle
                  ? t('catalogs.resultsPreviewNamed', { name: previewTitle })
                  : t('catalogs.resultsPreview')
              }
            >
              {previewWarnings.length > 0 ? (
                <ul
                  className="mb-3 space-y-1 text-sm text-amber-700 dark:text-amber-400"
                  role="status"
                >
                  {previewWarnings.map((warning) => (
                    <li key={warning}>{warning}</li>
                  ))}
                </ul>
              ) : null}
              {previewMetas.length === 0 ? (
                <p className="text-sm ml-text-muted">{t('catalogs.resultsEmpty')}</p>
              ) : (
                <ol className="space-y-2">
                  {previewMetas.slice(0, 12).map((meta) => (
                    <li key={`${meta.id}-${meta.sourceInstanceId ?? ''}`} className="text-sm">
                      <span className="font-medium text-[var(--ml-text)]">{meta.name}</span>
                      <span className="ms-2 font-mono text-xs ml-text-muted">
                        {meta.id}
                      </span>
                    </li>
                  ))}
                </ol>
              )}
            </SectionCard>
          </div>
        </div>
      ) : null}

      <StudioPromptDialog
        open={editDialog !== null}
        title={dialogTitle}
        label={dialogLabel}
        value={editDialog?.value ?? ''}
        onChange={(value) => {
          if (!editDialog) return;
          setEditDialog({ ...editDialog, value });
        }}
        onConfirm={() => {
          void submitEditDialog();
        }}
        onCancel={() => setEditDialog(null)}
        confirmLabel={t('catalogs.dialog.confirm')}
        cancelLabel={t('catalogs.dialog.cancel')}
      />
    </section>
  );
}
