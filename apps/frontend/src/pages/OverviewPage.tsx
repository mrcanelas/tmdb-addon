import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import {
  BookOpen,
  ChevronRight,
  Download,
  Github,
  Heart,
  LifeBuoy,
  MessagesSquare,
  Play,
  RefreshCw,
  Rocket,
  Server,
} from 'lucide-react';
import { Button, Card, Chip, Modal, Tabs } from '@metalayer/shared-ui';
import {
  dryRunLegacyImport,
  ensureStudioSession,
  parseLegacyImportInput,
  persistLegacyImport,
  writeCatalogSession,
  type LegacyImportReportView,
} from '@/lib/api';
import { syncStudioSessionQuery } from '@/api/hooks/use-studio-session';
import { WhatsNewPanel } from '@/components/home/WhatsNewPanel';
import { usePageHeader } from '@/contexts/page-title';
import { HOME_PRESETS, PENDING_PRESET_KEY, type HomePresetId } from '@/lib/home-presets';
import { HOME_RESOURCES } from '@/lib/home-resources';
import { useConfigureUiStore } from '@/stores/ui-store';

const TEXTAREA_CLASS =
  'mt-3 min-h-28 w-full rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2 font-mono text-xs text-[var(--foreground)]';

const RESOURCE_ICONS: Record<string, typeof BookOpen> = {
  docs: BookOpen,
  migration: RefreshCw,
  'self-hosting': Server,
  github: Github,
  discord: MessagesSquare,
  donate: Heart,
};

export function OverviewPage() {
  const { t } = useTranslation();
  usePageHeader(t('overview.home.welcomeTitle'), t('common.tagline'));
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const mode = useConfigureUiStore((s) => s.mode);
  const setMode = useConfigureUiStore((s) => s.setMode);
  const openDonateModal = useConfigureUiStore((s) => s.openDonateModal);
  const empty = t('common.emptyValue');

  const [importOpen, setImportOpen] = useState(false);
  const [legacyRaw, setLegacyRaw] = useState('');
  const [busy, setBusy] = useState(false);
  const [report, setReport] = useState<LegacyImportReportView | null>(null);
  const [pendingLegacy, setPendingLegacy] = useState<unknown>(null);
  const [feedback, setFeedback] = useState<
    { tone: 'ok' | 'error'; message: string } | null
  >(null);

  async function onPreviewImport() {
    setBusy(true);
    setFeedback(null);
    setReport(null);
    setPendingLegacy(null);
    try {
      const legacy = parseLegacyImportInput(legacyRaw);
      const result = await dryRunLegacyImport(legacy);
      setPendingLegacy(legacy);
      setReport(result.report);
    } catch {
      setFeedback({ tone: 'error', message: t('overview.importError') });
    } finally {
      setBusy(false);
    }
  }

  async function onConfirmImport() {
    if (pendingLegacy === null) return;
    setBusy(true);
    setFeedback(null);
    try {
      const editCredential = `import-${crypto.randomUUID().replace(/-/g, '')}`;
      const result = await persistLegacyImport(pendingLegacy, editCredential);
      const nextSession = {
        configId: result.configId,
        editCredential,
      };
      writeCatalogSession(nextSession);
      syncStudioSessionQuery(queryClient, nextSession);
      setFeedback({
        tone: 'ok',
        message: t('overview.importOk', { id: result.configId }),
      });
      setReport(null);
      setPendingLegacy(null);
      setLegacyRaw('');
      setImportOpen(false);
      navigate('/save-install');
    } catch {
      setFeedback({ tone: 'error', message: t('overview.importPersistError') });
    } finally {
      setBusy(false);
    }
  }

  async function startSetup() {
    setBusy(true);
    setFeedback(null);
    try {
      const next = await ensureStudioSession();
      syncStudioSessionQuery(queryClient, next);
      navigate('/sources');
    } catch {
      setFeedback({ tone: 'error', message: t('overview.setupError') });
    } finally {
      setBusy(false);
    }
  }

  async function applyPreset(presetId: HomePresetId) {
    setBusy(true);
    setFeedback(null);
    try {
      const next = await ensureStudioSession();
      writeCatalogSession(next);
      syncStudioSessionQuery(queryClient, next);
      sessionStorage.setItem(PENDING_PRESET_KEY, presetId);
      setFeedback({
        tone: 'ok',
        message: t('overview.presets.appliedHint', {
          name: t(
            HOME_PRESETS.find((preset) => preset.id === presetId)?.nameKey ??
              'overview.presets.recommended.name',
          ),
        }),
      });
      navigate('/sources');
    } catch {
      setFeedback({ tone: 'error', message: t('overview.presets.applyError') });
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="space-y-6">
      {feedback?.tone === 'ok' ? (
        <p className="text-sm text-[var(--success)]" role="status">
          {feedback.message}
        </p>
      ) : null}
      {feedback?.tone === 'error' ? (
        <p className="text-sm text-[var(--danger)]" role="alert">
          {feedback.message}
        </p>
      ) : null}

      <div className="flex flex-col gap-6 xl:flex-row xl:items-stretch">
        {/* min-w-0 + overflow keep preset rail from spilling under What’s New */}
        <div className="min-w-0 flex-1 space-y-6 overflow-x-clip">
          <div className="grid gap-4 lg:grid-cols-5">
            <Card className="lg:col-span-2">
              <Card.Header className="flex flex-row items-start justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Card.Title className='text-xl'>{t('overview.getStarted.title')}</Card.Title>
                </div>
              </Card.Header>
              <Card.Content className="space-y-4">
                <Card.Description>{t('overview.getStarted.body')}</Card.Description>
                <Tabs
                  selectedKey={mode}
                  onSelectionChange={(key) => {
                    if (key === 'simple' || key === 'advanced') {
                      setMode(key);
                    }
                  }}
                  className="w-full"
                >
                  <Tabs.ListContainer>
                    <Tabs.List aria-label={t('shell.mode.aria')}>
                      <Tabs.Tab id="simple">
                        {t('shell.mode.simple')}
                        <Tabs.Indicator />
                      </Tabs.Tab>
                      <Tabs.Tab id="advanced">
                        {t('shell.mode.advanced')}
                        <Tabs.Indicator />
                      </Tabs.Tab>
                    </Tabs.List>
                  </Tabs.ListContainer>
                </Tabs>
                <div className="flex flex-col gap-2">
                  <Button
                    type="button"
                    size="lg"
                    fullWidth
                    isDisabled={busy}
                    onPress={() => {
                      void startSetup();
                    }}
                  >
                    <Play className="size-4" fill="currentColor" aria-hidden />
                    {t('overview.getStarted.start')}
                  </Button>
                  <Button
                    type="button"
                    size="lg"
                    variant="tertiary"
                    fullWidth
                    onPress={() => {
                      setImportOpen(true);
                      setFeedback(null);
                    }}
                  >
                    <Download className="size-4" aria-hidden />
                    {t('overview.ctaImport')}
                  </Button>
                </div>
              </Card.Content>
              <Card.Footer>
                <p className="text-sm ml-text-muted justify-center">
                  {t('overview.getStarted.existingHint')}{' '}
                  <Link
                    to="/save-install"
                    className="font-medium text-[var(--accent)] underline-offset-4 hover:underline"
                  >
                    {t('overview.ctaSave')}
                  </Link>
                </p>
              </Card.Footer>
            </Card>

            <Card className="lg:col-span-3">
              <Card.Header className="flex flex-row items-center gap-2">
                <Card.Title className='text-xl'>{t('overview.resources.title')}</Card.Title>
              </Card.Header>
              <Card.Content>
                <div className="grid h-full gap-2 grid-cols-2 lg:grid-cols-3">
                  {HOME_RESOURCES.map((resource) => {
                    const Icon = RESOURCE_ICONS[resource.id] ?? BookOpen;
                    const tileClass =
                      '!flex h-full min-h-24 w-full !flex-col !items-start !justify-between gap-3 whitespace-normal rounded-[var(--radius)] px-3 py-3 text-start font-normal';
                    const label = (
                      <>
                        <Icon className="size-5 shrink-0 self-start" aria-hidden />
                        <span className="flex w-full items-center justify-between gap-2 text-sm font-medium">
                          {t(resource.labelKey)}
                          <ChevronRight className="size-4 shrink-0 opacity-60" aria-hidden />
                        </span>
                      </>
                    );

                    if (resource.kind === 'donate') {
                      return (
                        <Button
                          key={resource.id}
                          type="button"
                          variant="danger-soft"
                          fullWidth
                          className={tileClass}
                          onPress={openDonateModal}
                        >
                          {label}
                        </Button>
                      );
                    }

                    return (
                      <Button
                        key={resource.id}
                        type="button"
                        variant="outline"
                        fullWidth
                        className={tileClass}
                        onPress={() => {
                          if (resource.href) {
                            window.open(
                              resource.href,
                              '_blank',
                              'noopener,noreferrer',
                            );
                          }
                        }}
                      >
                        {label}
                      </Button>
                    );
                  })}
                </div>
              </Card.Content>
            </Card>
          </div>

          <div className="space-y-3">
            <div>
              <h2 className="text-lg font-semibold text-[var(--foreground)]">
                {t('overview.presets.title')}
              </h2>
              <p className="text-sm ml-text-muted">{t('overview.presets.body')}</p>
            </div>
            <div className="flex flex-col lg:flex-row min-w-0 gap-3 pb-1">
              {HOME_PRESETS.map((preset) => {
                const Icon = preset.Icon;
                return (
                  <Card key={preset.id} className="w-full">
                    <Card.Header className="items-center text-center">
                      <span
                        className="mx-auto flex size-10 items-center justify-center rounded-full bg-[var(--surface-secondary)]"
                        aria-hidden
                      >
                        <Icon className="size-5 text-[var(--foreground)]" />
                      </span>
                      <Card.Title className="mt-2 text-base">
                        {t(preset.nameKey)}
                      </Card.Title>
                    </Card.Header>
                    <Card.Content>
                      <Card.Description className="text-center text-xs">
                        {t(preset.descriptionKey)}
                      </Card.Description>
                    </Card.Content>
                    <Card.Footer>
                      <Button
                        type="button"
                        variant="outline"
                        fullWidth
                        isDisabled={busy}
                        onPress={() => {
                          void applyPreset(preset.id);
                        }}
                      >
                        {t('overview.presets.apply')}
                      </Button>
                    </Card.Footer>
                  </Card>
                );
              })}
            </div>
          </div>
        </div>

        {/*
          On xl, take the rail out of height calculation so the row follows
          Get Started + Resources + Presets; absolute fill matches that height.
        */}
        <aside className="relative z-10 w-full shrink-0 xl:h-[calc(100dvh-8.25rem)] xl:w-[340px]">
          <div className="xl:absolute xl:inset-0 xl:flex xl:min-h-0">
            <WhatsNewPanel />
          </div>
        </aside>
      </div>

      <Modal.Backdrop
        isOpen={importOpen}
        onOpenChange={setImportOpen}
        variant="blur"
        isDismissable
      >
        <Modal.Container size="lg" placement="center">
          <Modal.Dialog>
            <Modal.CloseTrigger />
            <Modal.Header>
              <Modal.Heading>{t('overview.importTitle')}</Modal.Heading>
            </Modal.Header>
            <Modal.Body className="gap-3">
              <p className="text-sm ml-text-muted">{t('overview.importBody')}</p>
              <label className="block text-sm text-[var(--foreground)]">
                <span>{t('overview.importPayloadLabel')}</span>
                <textarea
                  className={TEXTAREA_CLASS}
                  value={legacyRaw}
                  onChange={(event) => setLegacyRaw(event.target.value)}
                  spellCheck={false}
                  aria-describedby="overview-import-hint"
                />
              </label>
              <p id="overview-import-hint" className="text-xs ml-text-muted">
                {t('overview.importPayloadHint')}
              </p>
              {report ? (
                <div className="space-y-2 text-sm text-[var(--foreground)]" role="status">
                  <p>
                    {t('overview.importImported', {
                      list: report.imported.join(', ') || empty,
                    })}
                  </p>
                  <p>
                    {t('overview.importSecrets', {
                      list: report.secretsToVault.join(', ') || empty,
                    })}
                  </p>
                  {report.needsAttention.length > 0 ? (
                    <ul className="list-disc space-y-1 ps-5 text-[var(--warning)]">
                      {report.needsAttention.map((item) => (
                        <li
                          key={`${item.code}-${item.field ?? ''}-${item.params?.catalogId ?? ''}`}
                        >
                          {t(`overview.attention.${item.code}`, {
                            field: item.field,
                            catalogId: item.params?.catalogId,
                            defaultValue: item.message,
                          })}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="ml-text-muted">
                      {t('overview.importNoAttention')}
                    </p>
                  )}
                </div>
              ) : null}
            </Modal.Body>
            <Modal.Footer>
              <Button
                type="button"
                variant="outline"
                onPress={() => setImportOpen(false)}
              >
                {t('overview.presets.cancel')}
              </Button>
              <Button
                type="button"
                variant="outline"
                isDisabled={busy || !legacyRaw.trim()}
                onPress={() => {
                  void onPreviewImport();
                }}
              >
                {t('overview.importPreview')}
              </Button>
              <Button
                type="button"
                isDisabled={busy || pendingLegacy === null}
                onPress={() => {
                  void onConfirmImport();
                }}
              >
                {t('overview.importConfirm')}
              </Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </section>
  );
}
