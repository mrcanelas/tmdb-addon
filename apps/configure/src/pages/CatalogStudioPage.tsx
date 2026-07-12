import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  bootstrapCatalogDraft,
  clearCatalogSession,
  fetchCatalogs,
  mutateCatalog,
  readCatalogSession,
  type CatalogListItem,
  type ManifestCatalogEntry,
  type StudioCatalogAction,
} from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

function displayName(catalog: CatalogListItem): string {
  return catalog.customName || catalog.name?.default || catalog.originalName;
}

export function CatalogStudioPage() {
  const { t, i18n } = useTranslation('catalogs');
  const [catalogs, setCatalogs] = useState<CatalogListItem[]>([]);
  const [manifestOrder, setManifestOrder] = useState<ManifestCatalogEntry[]>([]);
  const [configId, setConfigId] = useState<string | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [busyId, setBusyId] = useState<string | null>(null);

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
    extra?: { customName?: string; toIndex?: number },
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

  return (
    <section className="space-y-6">
      <header className="space-y-2">
        <h1 className="font-display text-3xl font-semibold tracking-tight">
          {t('catalogs.title')}
        </h1>
        <p className="max-w-2xl text-muted-foreground">{t('catalogs.intro')}</p>
        <p className="max-w-2xl text-sm text-muted-foreground">{t('catalogs.syncHint')}</p>
        {configId ? (
          <p className="font-mono text-xs text-muted-foreground">
            {t('catalogs.configId', { id: configId })}
          </p>
        ) : null}
        <div className="flex flex-wrap gap-2 pt-1">
          <Button type="button" variant="outline" size="sm" onClick={() => void load(true)}>
            {t('catalogs.actions.resetDraft')}
          </Button>
        </div>
        {status === 'loading' ? (
          <p className="text-sm text-muted-foreground" role="status">
            {t('catalogs.bootstrapping')}
          </p>
        ) : null}
        {status === 'error' ? (
          <p className="text-sm text-amber-700 dark:text-amber-400" role="status">
            {t('catalogs.loadError')}
          </p>
        ) : null}
      </header>

      {status === 'ready' && catalogs.length === 0 ? (
        <p className="text-muted-foreground">{t('catalogs.empty')}</p>
      ) : null}

      {status === 'ready' && catalogs.length > 0 ? (
        <div className="grid gap-8 lg:grid-cols-2">
          <div className="space-y-3">
            <h2 className="text-lg font-semibold tracking-tight">{t('catalogs.studioList')}</h2>
            <ol className="space-y-3">
              {catalogs.map((catalog, index) => {
                const busy = busyId === catalog.instanceId;
                return (
                  <li
                    key={catalog.instanceId}
                    className="border-b border-border/60 pb-3 last:border-b-0"
                  >
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <div>
                        <p className="font-medium">
                          <span className="me-2 font-mono text-xs text-muted-foreground">
                            {catalog.position + 1}.
                          </span>
                          {displayName(catalog)}
                        </p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {t('catalogs.field.provider')}: {catalog.provider}.
                          {catalog.providerCatalogId}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        <Badge variant="secondary">
                          {t(`catalogs.type.${catalog.mediaType}`)}
                        </Badge>
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
                        disabled={busy || index === 0}
                        onClick={() => void runAction(catalog.instanceId, 'move', { toIndex: index - 1 })}
                      >
                        {t('catalogs.actions.moveUp')}
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={busy || index === catalogs.length - 1}
                        onClick={() => void runAction(catalog.instanceId, 'move', { toIndex: index + 1 })}
                      >
                        {t('catalogs.actions.moveDown')}
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        disabled={busy}
                        onClick={() => {
                          const next = window.prompt(
                            t('catalogs.renamePrompt'),
                            displayName(catalog),
                          );
                          if (next?.trim()) {
                            void runAction(catalog.instanceId, 'rename', {
                              customName: next.trim(),
                            });
                          }
                        }}
                      >
                        {t('catalogs.actions.rename')}
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        disabled={busy}
                        onClick={() => void runAction(catalog.instanceId, 'duplicate')}
                      >
                        {t('catalogs.actions.duplicate')}
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        disabled={busy}
                        onClick={() =>
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
                        variant="ghost"
                        disabled={busy}
                        onClick={() =>
                          void runAction(
                            catalog.instanceId,
                            catalog.showInHome ? 'hideInHome' : 'showInHome',
                          )
                        }
                      >
                        {t(
                          catalog.showInHome
                            ? 'catalogs.actions.hideInHome'
                            : 'catalogs.actions.showInHome',
                        )}
                      </Button>
                    </div>
                  </li>
                );
              })}
            </ol>
          </div>

          <div className="space-y-3">
            <h2 className="text-lg font-semibold tracking-tight">
              {t('catalogs.manifestPreview')}
            </h2>
            <ol className="space-y-2 border-s border-border/60 ps-4">
              {manifestOrder.map((entry, index) => (
                <li key={entry.instanceId} className="text-sm">
                  <span className="me-2 font-mono text-xs text-muted-foreground">
                    {index + 1}.
                  </span>
                  <span className="font-medium">{entry.name}</span>
                  <span className="ms-2 text-muted-foreground">
                    ({t(`catalogs.type.${entry.type}`)})
                  </span>
                </li>
              ))}
            </ol>
          </div>
        </div>
      ) : null}
    </section>
  );
}
