import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, Modal } from '@metalayer/shared-ui';
import type { AccountCatalogImportSelection, PublicSource } from '@/lib/api';
import { useStudioSessionQuery } from '@/api/hooks/use-studio-session';
import {
  useAccountCatalogSourcesQuery,
  useImportAccountCatalogsMutation,
} from '@/api/hooks/use-account-catalogs';
import { sourceDescriptionKey } from '@/lib/source-presentation';
import { SourceProviderIcon } from '@/components/sources/SourceProviderIcon';

/** Providers whose catalogs come from a connected account (server: ACCOUNT_CATALOG_PROVIDERS). */
export const ACCOUNT_CATALOG_PROVIDER_IDS = new Set([
  'trakt',
  'mdblist',
  'tmdb',
  'simkl',
  'anilist',
  'mal',
]);

type Feedback =
  | { kind: 'idle' }
  | { kind: 'success'; messageKey: string; params?: Record<string, string | number> }
  | { kind: 'error'; messageKey: string };

function selectionKey(selection: AccountCatalogImportSelection): string {
  return `${selection.provider}|${selection.providerCatalogId}|${selection.mediaType}`;
}

/**
 * Picks account/list catalogs (watchlist, lists, recommendations, …) for a
 * connected provider and imports them into Catalog Studio (AGENTS.md §8.1.1).
 */
export function AccountCatalogsModal({
  source,
  isOpen,
  onOpenChange,
  onImported,
}: {
  source: PublicSource;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onImported?: (imported: number) => void;
}) {
  const { t } = useTranslation(['sources', 'catalogs']);
  const sessionQuery = useStudioSessionQuery();
  const configId = sessionQuery.data?.configId;
  const editCredential = sessionQuery.data?.editCredential;
  const sessionReady = Boolean(configId && editCredential);

  const sourcesQuery = useAccountCatalogSourcesQuery(configId, editCredential, isOpen);
  const importMutation = useImportAccountCatalogsMutation(
    configId ?? '',
    editCredential ?? '',
  );

  const [selected, setSelected] = useState<Map<string, AccountCatalogImportSelection>>(
    new Map(),
  );
  const [feedback, setFeedback] = useState<Feedback>({ kind: 'idle' });

  useEffect(() => {
    if (!isOpen) {
      setSelected(new Map());
      setFeedback({ kind: 'idle' });
    }
  }, [isOpen]);

  const view = useMemo(
    () => sourcesQuery.data?.sources.find((entry) => entry.provider === source.id),
    [sourcesQuery.data, source.id],
  );

  const options = useMemo<AccountCatalogImportSelection[]>(() => {
    if (!view) return [];
    return view.catalogs.flatMap((catalog) =>
      catalog.mediaTypes.map((mediaType) => ({
        provider: catalog.provider,
        providerCatalogId: catalog.providerCatalogId,
        mediaType,
        name: catalog.name,
      })),
    );
  }, [view]);

  const description = t(sourceDescriptionKey(source.id), { defaultValue: '' });

  function toggle(selection: AccountCatalogImportSelection, checked: boolean) {
    setSelected((current) => {
      const next = new Map(current);
      const key = selectionKey(selection);
      if (checked) next.set(key, selection);
      else next.delete(key);
      return next;
    });
  }

  async function onImport() {
    if (!sessionReady || importMutation.isPending || selected.size === 0) return;
    setFeedback({ kind: 'idle' });
    try {
      const result = await importMutation.mutateAsync([...selected.values()]);
      onImported?.(result.imported);
      setFeedback({
        kind: 'success',
        messageKey: 'sources.accountCatalogs.importSuccess',
        params: { imported: result.imported, skipped: result.skipped },
      });
      setSelected(new Map());
    } catch {
      setFeedback({ kind: 'error', messageKey: 'sources.accountCatalogs.errors.importFailed' });
    }
  }

  const reasonKey = view?.reason ? `sources.accountCatalogs.reason.${view.reason}` : undefined;

  return (
    <Modal.Backdrop
      isOpen={isOpen}
      onOpenChange={(open) => {
        if (!open) setFeedback({ kind: 'idle' });
        onOpenChange(open);
      }}
      variant="blur"
      isDismissable
    >
      <Modal.Container size="lg" placement="center">
        <Modal.Dialog>
          <Modal.CloseTrigger />
          <Modal.Header>
            <div className="flex items-start gap-3 pe-8">
              <SourceProviderIcon providerId={source.id} name={source.name} size="md" />
              <div className="min-w-0 space-y-1">
                <Modal.Heading>
                  {t('sources.accountCatalogs.title', { name: source.name })}
                </Modal.Heading>
                {description ? (
                  <p className="text-sm ml-text-muted">{description}</p>
                ) : null}
              </div>
            </div>
          </Modal.Header>
          <Modal.Body className="max-h-[min(70vh,640px)] gap-4 overflow-y-auto">
            {!sessionReady || sourcesQuery.isLoading ? (
              <p className="text-sm ml-text-muted">{t('sources.accountCatalogs.loading')}</p>
            ) : null}

            {sourcesQuery.isError ? (
              <p className="text-sm text-danger" role="alert">
                {t('sources.accountCatalogs.errors.loadFailed')}
              </p>
            ) : null}

            {view && reasonKey && options.length === 0 ? (
              <p className="text-sm ml-text-muted" role="status">
                {t(reasonKey, { name: source.name })}
              </p>
            ) : null}

            {view && options.length > 0 ? (
              <section className="space-y-3 rounded-xl border border-border p-4">
                <div>
                  <h3 className="text-sm font-medium">
                    {t('sources.accountCatalogs.listTitle')}
                  </h3>
                  <p className="text-sm ml-text-muted">
                    {view.connected
                      ? t('sources.accountCatalogs.listHint')
                      : t('sources.accountCatalogs.publicOnlyHint', { name: source.name })}
                  </p>
                </div>
                <ul className="max-h-72 space-y-2 overflow-y-auto">
                  {options.map((option) => {
                    const key = selectionKey(option);
                    return (
                      <li
                        key={key}
                        className="flex items-start gap-2 rounded-lg border border-border px-3 py-2"
                      >
                        <input
                          type="checkbox"
                          className="mt-1"
                          checked={selected.has(key)}
                          onChange={(event) => toggle(option, event.target.checked)}
                          aria-label={`${option.name} · ${t(`catalogs:catalogs.type.${option.mediaType}`)}`}
                        />
                        <div className="min-w-0">
                          <p className="text-sm font-medium">{option.name}</p>
                          <p className="text-xs ml-text-muted">
                            {t(`catalogs:catalogs.type.${option.mediaType}`)}
                          </p>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </section>
            ) : null}

            {feedback.kind === 'success' ? (
              <p className="text-sm text-success" role="status">
                {t(feedback.messageKey, feedback.params)}
              </p>
            ) : null}
            {feedback.kind === 'error' ? (
              <p className="text-sm text-danger" role="alert">
                {t(feedback.messageKey)}
              </p>
            ) : null}
          </Modal.Body>
          <Modal.Footer>
            <Button type="button" variant="outline" onPress={() => onOpenChange(false)}>
              {t('sources.configure.close')}
            </Button>
            {options.length > 0 ? (
              <Button
                type="button"
                onPress={onImport}
                isDisabled={importMutation.isPending || selected.size === 0}
              >
                {importMutation.isPending
                  ? t('sources.accountCatalogs.importing')
                  : t('sources.accountCatalogs.import', { count: selected.size })}
              </Button>
            ) : null}
          </Modal.Footer>
        </Modal.Dialog>
      </Modal.Container>
    </Modal.Backdrop>
  );
}
