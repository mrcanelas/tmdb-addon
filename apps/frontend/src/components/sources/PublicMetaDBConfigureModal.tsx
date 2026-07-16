import { useEffect, useState, type Dispatch, type SetStateAction } from 'react';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button, Input, Modal } from '@metalayer/shared-ui';
import type { PublicSource } from '@/lib/api';
import { useStudioSessionQuery } from '@/api/hooks/use-studio-session';
import {
  useConnectPublicMetaDBMutation,
  useDisconnectPublicMetaDBMutation,
  useImportPublicMetaDBCatalogsMutation,
  useLoadPublicMetaDBListsMutation,
  useLoadPublicMetaDBPicksMutation,
  usePublicMetaDBStatusQuery,
} from '@/api/hooks/use-publicmetadb';
import {
  sourceTestFormSchema,
  type SourceTestFormValues,
} from '@/api/schemas/source-test';
import { sourceDescriptionKey } from '@/lib/source-presentation';
import { SourceProviderIcon } from '@/components/sources/SourceProviderIcon';

type Feedback =
  | { kind: 'idle' }
  | { kind: 'success'; messageKey: string; params?: Record<string, string | number> }
  | { kind: 'error'; messageKey: string };

export function PublicMetaDBConfigureModal({
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
  const { t } = useTranslation('sources');
  const sessionQuery = useStudioSessionQuery();
  const configId = sessionQuery.data?.configId;
  const editCredential = sessionQuery.data?.editCredential;

  const statusQuery = usePublicMetaDBStatusQuery(configId, editCredential);
  const connectMutation = useConnectPublicMetaDBMutation(
    configId ?? '',
    editCredential ?? '',
  );
  const disconnectMutation = useDisconnectPublicMetaDBMutation(
    configId ?? '',
    editCredential ?? '',
  );
  const listsMutation = useLoadPublicMetaDBListsMutation(
    configId ?? '',
    editCredential ?? '',
  );
  const picksMutation = useLoadPublicMetaDBPicksMutation(
    configId ?? '',
    editCredential ?? '',
  );
  const importMutation = useImportPublicMetaDBCatalogsMutation(
    configId ?? '',
    editCredential ?? '',
  );

  const [feedback, setFeedback] = useState<Feedback>({ kind: 'idle' });
  const [lists, setLists] = useState<Array<{ id: string; name: string }>>([]);
  const [picks, setPicks] = useState<
    Array<{ id: string; name: string; mediaTypes?: string[] }>
  >([]);
  const [selectedLists, setSelectedLists] = useState<Set<string>>(new Set());
  const [selectedPicks, setSelectedPicks] = useState<Set<string>>(new Set());
  const [includeUpNext, setIncludeUpNext] = useState(false);

  const form = useForm<SourceTestFormValues>({
    resolver: zodResolver(sourceTestFormSchema),
    defaultValues: { apiKey: '' },
  });

  const connected = statusQuery.data?.connected === true;
  const sessionReady = Boolean(configId && editCredential);
  const description = t(sourceDescriptionKey(source.id), { defaultValue: '' });

  useEffect(() => {
    if (!isOpen) {
      setFeedback({ kind: 'idle' });
      setSelectedLists(new Set());
      setSelectedPicks(new Set());
      setIncludeUpNext(false);
      form.reset({ apiKey: '' });
    }
  }, [isOpen, form]);

  async function onConnect(values: SourceTestFormValues) {
    if (!sessionReady || connectMutation.isPending) return;
    const apiKey = values.apiKey?.trim();
    if (!apiKey) {
      setFeedback({ kind: 'error', messageKey: 'sources.publicmetadb.errors.keyRequired' });
      return;
    }
    if (!apiKey.startsWith('pm-')) {
      setFeedback({ kind: 'error', messageKey: 'sources.publicmetadb.errors.keyFormat' });
      return;
    }

    setFeedback({ kind: 'idle' });
    try {
      await connectMutation.mutateAsync(apiKey);
      form.reset({ apiKey: '' });
      setFeedback({ kind: 'success', messageKey: 'sources.publicmetadb.connected' });
    } catch {
      setFeedback({ kind: 'error', messageKey: 'sources.publicmetadb.errors.connectFailed' });
    }
  }

  async function onDisconnect() {
    if (!sessionReady || disconnectMutation.isPending) return;
    try {
      await disconnectMutation.mutateAsync();
      setLists([]);
      setPicks([]);
      setSelectedLists(new Set());
      setSelectedPicks(new Set());
      setIncludeUpNext(false);
      setFeedback({ kind: 'success', messageKey: 'sources.publicmetadb.disconnected' });
    } catch {
      setFeedback({ kind: 'error', messageKey: 'sources.publicmetadb.errors.disconnectFailed' });
    }
  }

  async function loadLists() {
    if (!sessionReady) return;
    setFeedback({ kind: 'idle' });
    try {
      const data = await listsMutation.mutateAsync(undefined);
      setLists(data.items ?? []);
      setSelectedLists(new Set());
      if ((data.items ?? []).length === 0) {
        setFeedback({ kind: 'success', messageKey: 'sources.publicmetadb.listsEmpty' });
      }
    } catch {
      setFeedback({ kind: 'error', messageKey: 'sources.publicmetadb.errors.listsFailed' });
    }
  }

  async function loadPicks() {
    if (!sessionReady) return;
    setFeedback({ kind: 'idle' });
    try {
      const data = await picksMutation.mutateAsync(undefined);
      const items = (data.items ?? []).map((pick) => ({
        id: pick.id,
        name: pick.name,
        mediaTypes: pick.filters?.media_types,
      }));
      setPicks(items);
      setSelectedPicks(new Set());
      if (items.length === 0) {
        setFeedback({ kind: 'success', messageKey: 'sources.publicmetadb.picksEmpty' });
      }
    } catch {
      setFeedback({ kind: 'error', messageKey: 'sources.publicmetadb.errors.picksFailed' });
    }
  }

  async function onImport() {
    if (!sessionReady || importMutation.isPending) return;

    const selections = [];
    if (includeUpNext) {
      selections.push({ kind: 'upnext' as const });
    }
    for (const listId of selectedLists) {
      const list = lists.find((entry) => entry.id === listId);
      if (list) {
        selections.push({ kind: 'list' as const, listId: list.id, name: list.name });
      }
    }
    for (const pickId of selectedPicks) {
      const pick = picks.find((entry) => entry.id === pickId);
      if (pick) {
        selections.push({
          kind: 'pick' as const,
          pickId: pick.id,
          name: pick.name,
          mediaTypes: pick.mediaTypes,
        });
      }
    }

    if (selections.length === 0) {
      setFeedback({ kind: 'error', messageKey: 'sources.publicmetadb.errors.nothingSelected' });
      return;
    }

    setFeedback({ kind: 'idle' });
    try {
      const result = await importMutation.mutateAsync({ selections });
      onImported?.(result.imported);
      setFeedback({
        kind: 'success',
        messageKey: 'sources.publicmetadb.importSuccess',
        params: { imported: result.imported, skipped: result.skipped },
      });
      setSelectedLists(new Set());
      setSelectedPicks(new Set());
      setIncludeUpNext(false);
    } catch {
      setFeedback({ kind: 'error', messageKey: 'sources.publicmetadb.errors.importFailed' });
    }
  }

  function toggleSetValue(
    set: Dispatch<SetStateAction<Set<string>>>,
    id: string,
    checked: boolean,
  ) {
    set((current) => {
      const next = new Set(current);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  const importCount =
    selectedLists.size + selectedPicks.size + (includeUpNext ? 1 : 0);

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
              <SourceProviderIcon
                providerId={source.id}
                name={source.name}
                size="md"
              />
              <div className="min-w-0 space-y-1">
                <Modal.Heading>
                  {t('sources.configure.title', { name: source.name })}
                </Modal.Heading>
                {description ? (
                  <p className="text-sm ml-text-muted">{description}</p>
                ) : null}
              </div>
            </div>
          </Modal.Header>
          <Modal.Body className="max-h-[min(70vh,640px)] gap-4 overflow-y-auto">
            {!sessionReady ? (
              <p className="text-sm ml-text-muted">
                {t('sources.publicmetadb.sessionLoading')}
              </p>
            ) : null}

            <section className="space-y-3 rounded-xl border border-[var(--border)] p-4">
              <h3 className="text-sm font-medium">
                {t('sources.publicmetadb.apiKeyTitle')}
              </h3>
              <p className="text-sm ml-text-muted">
                {t('sources.publicmetadb.apiKeyHint')}
              </p>
              <form
                id="publicmetadb-connect-form"
                className="flex flex-col gap-3 sm:flex-row sm:items-end"
                onSubmit={form.handleSubmit(onConnect)}
              >
                <label className="block min-w-0 flex-1 space-y-1.5">
                  <span className="text-sm ml-text-muted">
                    {t('sources.test.apiKeyLabel')}
                  </span>
                  <Input
                    type="password"
                    autoComplete="off"
                    placeholder={t('sources.publicmetadb.apiKeyPlaceholder')}
                    disabled={connected}
                    {...form.register('apiKey')}
                  />
                </label>
                <div className="flex gap-2">
                  {connected ? (
                    <Button
                      type="button"
                      variant="outline"
                      onPress={onDisconnect}
                      isDisabled={disconnectMutation.isPending}
                    >
                      {t('sources.publicmetadb.disconnect')}
                    </Button>
                  ) : (
                    <Button
                      type="submit"
                      isDisabled={connectMutation.isPending || !sessionReady}
                    >
                      {connectMutation.isPending
                        ? t('sources.publicmetadb.validating')
                        : t('sources.publicmetadb.validate')}
                    </Button>
                  )}
                </div>
              </form>
            </section>

            {connected ? (
              <>
                <section className="space-y-3 rounded-xl border border-[var(--border)] p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-sm font-medium">
                        {t('sources.publicmetadb.upNextTitle')}
                      </h3>
                      <p className="text-sm ml-text-muted">
                        {t('sources.publicmetadb.upNextHint')}
                      </p>
                    </div>
                  </div>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={includeUpNext}
                      onChange={(event) => setIncludeUpNext(event.target.checked)}
                    />
                    <span>{t('sources.publicmetadb.upNextInclude')}</span>
                  </label>
                </section>

                <section className="space-y-3 rounded-xl border border-[var(--border)] p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <h3 className="text-sm font-medium">
                        {t('sources.publicmetadb.listsTitle')}
                      </h3>
                      <p className="text-sm ml-text-muted">
                        {t('sources.publicmetadb.listsHint')}
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onPress={loadLists}
                      isDisabled={listsMutation.isPending}
                    >
                      {listsMutation.isPending
                        ? t('sources.publicmetadb.loading')
                        : t('sources.publicmetadb.loadLists')}
                    </Button>
                  </div>
                  {lists.length > 0 ? (
                    <ul className="max-h-48 space-y-2 overflow-y-auto">
                      {lists.map((list) => (
                        <li
                          key={list.id}
                          className="flex items-start gap-2 rounded-lg border border-[var(--border)] px-3 py-2"
                        >
                          <input
                            type="checkbox"
                            className="mt-1"
                            checked={selectedLists.has(list.id)}
                            onChange={(event) =>
                              toggleSetValue(
                                setSelectedLists,
                                list.id,
                                event.target.checked,
                              )
                            }
                          />
                          <div className="min-w-0">
                            <p className="text-sm font-medium">{list.name}</p>
                          </div>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </section>

                <section className="space-y-3 rounded-xl border border-[var(--border)] p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <h3 className="text-sm font-medium">
                        {t('sources.publicmetadb.picksTitle')}
                      </h3>
                      <p className="text-sm ml-text-muted">
                        {t('sources.publicmetadb.picksHint')}
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onPress={loadPicks}
                      isDisabled={picksMutation.isPending}
                    >
                      {picksMutation.isPending
                        ? t('sources.publicmetadb.loading')
                        : t('sources.publicmetadb.loadPicks')}
                    </Button>
                  </div>
                  {picks.length > 0 ? (
                    <ul className="max-h-48 space-y-2 overflow-y-auto">
                      {picks.map((pick) => (
                        <li
                          key={pick.id}
                          className="flex items-start gap-2 rounded-lg border border-[var(--border)] px-3 py-2"
                        >
                          <input
                            type="checkbox"
                            className="mt-1"
                            checked={selectedPicks.has(pick.id)}
                            onChange={(event) =>
                              toggleSetValue(
                                setSelectedPicks,
                                pick.id,
                                event.target.checked,
                              )
                            }
                          />
                          <div className="min-w-0">
                            <p className="text-sm font-medium">{pick.name}</p>
                          </div>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </section>
              </>
            ) : null}

            {feedback.kind === 'success' ? (
              <p className="text-sm text-[var(--success)]" role="status">
                {t(feedback.messageKey, feedback.params)}
              </p>
            ) : null}
            {feedback.kind === 'error' ? (
              <p className="text-sm text-[var(--danger)]" role="alert">
                {t(feedback.messageKey)}
              </p>
            ) : null}
          </Modal.Body>
          <Modal.Footer>
            <Button type="button" variant="outline" onPress={() => onOpenChange(false)}>
              {t('sources.configure.close')}
            </Button>
            {connected ? (
              <Button
                type="button"
                onPress={onImport}
                isDisabled={importMutation.isPending || importCount === 0}
              >
                {importMutation.isPending
                  ? t('sources.publicmetadb.importing')
                  : t('sources.publicmetadb.import', { count: importCount })}
              </Button>
            ) : null}
          </Modal.Footer>
        </Modal.Dialog>
      </Modal.Container>
    </Modal.Backdrop>
  );
}
