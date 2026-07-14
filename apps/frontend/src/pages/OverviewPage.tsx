import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@metalayer/shared-ui';
import {
  dryRunLegacyImport,
  parseLegacyImportInput,
  persistLegacyImport,
  writeCatalogSession,
  type LegacyImportReportView,
} from '@/lib/api';
import { syncStudioSessionQuery } from '@/api/hooks/use-studio-session';
import { SectionCard } from '@/components/metalayer/SectionCard';
import { usePageTitleWithReset } from '@/contexts/page-title';
import { useConfigureUiStore } from '@/stores/ui-store';

const TEXTAREA_CLASS =
  'mt-3 min-h-28 w-full rounded-md border border-[var(--ml-border)] bg-[var(--ml-surface)] px-3 py-2 font-mono text-xs text-[var(--ml-text)]';

export function OverviewPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const mode = useConfigureUiStore((s) => s.mode);
  usePageTitleWithReset();
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
      const session = {
        configId: result.configId,
        editCredential,
      };
      writeCatalogSession(session);
      syncStudioSessionQuery(queryClient, session);
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

  return (
    <section className="space-y-6">
      <p className="max-w-2xl text-[var(--ml-muted)] lg:hidden">{t('overview.body')}</p>

      <div className="grid gap-4 md:grid-cols-2">
        <SectionCard
          title={t('overview.nextStepsTitle')}
          description={t('overview.nextStepsBody')}
        >
          <div className="flex flex-wrap gap-2">
            <Link to="/sources">
              <Button type="button">{t('overview.ctaSources')}</Button>
            </Link>
            <Link to="/metas/language">
              <Button type="button" variant="outline">
                {t('overview.ctaLanguage')}
              </Button>
            </Link>
            <Link to="/catalogs/studio">
              <Button type="button" variant="outline">
                {t('overview.ctaCatalogStudio')}
              </Button>
            </Link>
            <Link to="/save-install">
              <Button type="button" variant="quiet">
                {t('overview.ctaSave')}
              </Button>
            </Link>
          </div>
        </SectionCard>

        <SectionCard
          title={t('overview.modeTitle')}
          description={
            mode === 'simple'
              ? t('overview.modeSimpleBody')
              : t('overview.modeAdvancedBody')
          }
        >
          <p className="text-sm ml-text-muted">{t('overview.importHint')}</p>
          <Button
            type="button"
            variant="outline"
            className="mt-3"
            onPress={() => {
              setImportOpen((open) => !open);
              setFeedback(null);
            }}
          >
            {t('overview.ctaImport')}
          </Button>
        </SectionCard>
      </div>

      {importOpen ? (
        <SectionCard
          title={t('overview.importTitle')}
          description={t('overview.importBody')}
        >
          <label className="block text-sm text-[var(--ml-text)]">
            <span>{t('overview.importPayloadLabel')}</span>
            <textarea
              className={TEXTAREA_CLASS}
              value={legacyRaw}
              onChange={(event) => setLegacyRaw(event.target.value)}
              spellCheck={false}
              aria-describedby="overview-import-hint"
            />
          </label>
          <p id="overview-import-hint" className="mt-2 text-xs ml-text-muted">
            {t('overview.importPayloadHint')}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button
              type="button"
              isDisabled={busy || !legacyRaw.trim()}
              onPress={() => {
                void onPreviewImport();
              }}
            >
              {t('overview.importPreview')}
            </Button>
            <Button
              type="button"
              variant="outline"
              isDisabled={busy || pendingLegacy === null}
              onPress={() => {
                void onConfirmImport();
              }}
            >
              {t('overview.importConfirm')}
            </Button>
          </div>

          {feedback?.tone === 'ok' ? (
            <p className="mt-3 text-sm text-[var(--ml-success)]" role="status">
              {feedback.message}
            </p>
          ) : null}
          {feedback?.tone === 'error' ? (
            <p className="mt-3 text-sm text-[var(--ml-error)]" role="alert">
              {feedback.message}
            </p>
          ) : null}

          {report ? (
            <div className="mt-4 space-y-3 text-sm text-[var(--ml-text)]" role="status">
              <p>{t('overview.importImported', { list: report.imported.join(', ') || empty })}</p>
              <p>
                {t('overview.importSecrets', {
                  list: report.secretsToVault.join(', ') || empty,
                })}
              </p>
              {report.needsAttention.length > 0 ? (
                <ul className="list-disc space-y-1 ps-5 text-[var(--ml-warning)]">
                  {report.needsAttention.map((item) => (
                    <li key={`${item.code}-${item.field ?? ''}-${item.params?.catalogId ?? ''}`}>
                      {t(`overview.attention.${item.code}`, {
                        field: item.field,
                        catalogId: item.params?.catalogId,
                        defaultValue: item.message,
                      })}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="ml-text-muted">{t('overview.importNoAttention')}</p>
              )}
            </div>
          ) : null}
        </SectionCard>
      ) : null}
    </section>
  );
}
