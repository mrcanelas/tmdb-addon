import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ensureStudioSession,
  inspectMetadata,
  type IdentityDiagnosticsView,
  type MetaInspectorReport,
} from '@/lib/api';
import { Button } from '@metalayer/shared-ui';
import { PageHeader } from '@/components/metalayer/PageHeader';
import { SectionCard } from '@/components/metalayer/SectionCard';
import { LoadingState } from '@/components/metalayer/LoadingState';
import { ErrorState } from '@/components/metalayer/ErrorState';

const FIELD_KEYS = [
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
] as const;

const ATTEMPT_STATUS_KEYS = [
  'selected',
  'empty',
  'not-found',
  'skipped',
  'below-confidence',
] as const;

function translateAttemptStatus(
  status: string,
  t: (key: string) => string,
): string {
  if ((ATTEMPT_STATUS_KEYS as readonly string[]).includes(status)) {
    return t(`inspector.attemptStatus.${status}`);
  }
  return status;
}

function translateReasonCode(
  reason: string | undefined,
  t: (key: string, options?: Record<string, unknown>) => string,
  params?: Record<string, string | number>,
): string | null {
  if (!reason) return null;
  const key = `inspector.reason.${reason}`;
  const translated = t(key, params);
  return translated === key ? reason : translated;
}

const SAMPLE_CONTRIBUTIONS = {
  title: [
    { provider: 'tmdb', value: 'Fight Club', locale: 'en-US' },
    { provider: 'tmdb', value: 'Clube da Luta', locale: 'pt-BR' },
  ],
  originalTitle: [{ provider: 'tmdb', value: 'Fight Club' }],
  description: [
    { provider: 'tmdb', value: 'An insomniac office worker…', locale: 'en-US' },
    { provider: 'tmdb', value: 'Um homem deprimido…', locale: 'pt-BR' },
  ],
  poster: [
    { provider: 'rpdb', value: null },
    { provider: 'fanart', value: 'https://fanart.example/poster.jpg' },
    { provider: 'tmdb', value: 'https://image.tmdb.org/t/p/w500/poster.jpg' },
  ],
  background: [
    { provider: 'tmdb', value: 'https://image.tmdb.org/t/p/w1280/back.jpg' },
  ],
  logo: [
    { provider: 'rpdb', value: null },
    { provider: 'fanart', value: 'https://fanart.example/logo.png' },
    { provider: 'tvdb', value: 'https://tvdb.example/logo.png' },
  ],
  rating: [
    { provider: 'imdb', value: 8.8, confidence: 0.95 },
    { provider: 'tmdb', value: 8.4, confidence: 0.6 },
  ],
  voteCount: [{ provider: 'tmdb', value: 28000 }],
  releaseDate: [{ provider: 'tmdb', value: '1999-10-15' }],
  externalIds: [{ provider: 'tmdb', value: { tmdb: 550, imdb: 'tt0137523' } }],
};

const INPUT_CLASS =
  'h-10 rounded-md border border-[var(--ml-border)] bg-[var(--ml-surface)] px-3 text-[var(--ml-text)]';

export function InspectorPage() {
  const { t } = useTranslation(['inspector', 'common']);
  const [publicId, setPublicId] = useState('tt0137523');
  const [report, setReport] = useState<MetaInspectorReport | null>(null);
  const [identity, setIdentity] = useState<IdentityDiagnosticsView | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const empty = t('common.emptyValue', { ns: 'common' });

  function formatValue(value: unknown): string {
    if (value === null || value === undefined) return empty;
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
  }

  async function load() {
    setStatus('loading');
    setActionError(null);
    try {
      await ensureStudioSession();
      setStatus('ready');
    } catch {
      setStatus('error');
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function onDryRun() {
    setBusy(true);
    setActionError(null);
    try {
      const session = await ensureStudioSession();
      const result = await inspectMetadata(
        session.configId,
        session.editCredential,
        {
          id: publicId,
          mediaType: 'movie',
          contributions: SAMPLE_CONTRIBUTIONS,
        },
      );
      setReport(result.report);
      setIdentity(result.identity?.diagnostics ?? null);
    } catch {
      setActionError(t('inspector.inspectError'));
    } finally {
      setBusy(false);
    }
  }

  async function onInspectLive() {
    setBusy(true);
    setActionError(null);
    try {
      const session = await ensureStudioSession();
      const result = await inspectMetadata(
        session.configId,
        session.editCredential,
        {
          id: publicId,
          mediaType: 'movie',
        },
      );
      setReport(result.report);
      setIdentity(result.identity?.diagnostics ?? null);
    } catch {
      setActionError(t('inspector.inspectError'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="space-y-6">
      <PageHeader
        title={t('inspector.title')}
        description={t('inspector.intro')}
      />

      {status === 'loading' ? (
        <LoadingState label={t('inspector.bootstrapping')} />
      ) : null}

      {status === 'error' ? (
        <ErrorState
          message={t('inspector.sessionError')}
          retryLabel={t('state.retry', { ns: 'common' })}
          onRetry={() => {
            void load();
          }}
        />
      ) : null}

      {status === 'ready' ? (
        <>
          {actionError ? (
            <p className="text-sm text-[var(--ml-error)]" role="alert">
              {actionError}
            </p>
          ) : null}

          <SectionCard title={t('inspector.queryTitle')}>
            <div className="flex flex-wrap items-end gap-3">
              <label className="flex min-w-[16rem] flex-1 flex-col gap-1 text-sm text-[var(--ml-text)]">
                <span>{t('inspector.idLabel')}</span>
                <input
                  className={INPUT_CLASS}
                  value={publicId}
                  onChange={(event) => setPublicId(event.target.value)}
                />
              </label>
              <Button
                type="button"
                isDisabled={busy}
                onPress={() => {
                  void onDryRun();
                }}
              >
                {t('inspector.dryRun')}
              </Button>
              <Button
                type="button"
                variant="outline"
                isDisabled={busy}
                onPress={() => {
                  void onInspectLive();
                }}
              >
                {t('inspector.inspect')}
              </Button>
            </div>
          </SectionCard>

          {report ? (
            <div className="space-y-6">
              <SectionCard title={t('inspector.identity')}>
                <p className="text-sm ml-text-muted">
                  {report.identity.publicId ?? empty} ·{' '}
                  {report.identity.mediaType ?? empty}
                </p>
                <p className="mt-2 font-mono text-sm text-[var(--ml-text)]">
                  {formatValue(report.identity.matches)}
                </p>
                <p className="mt-2 text-sm text-[var(--ml-text)]">
                  {t('inspector.displayTitle')}:{' '}
                  {report.fields.displayTitle ?? empty}
                </p>
                <p className="mt-1 text-sm ml-text-muted" role="status">
                  {t('inspector.timing', { ms: report.timingMs })}
                </p>
              </SectionCard>

              {identity ? (
                <SectionCard title={t('inspector.graph')}>
                  <p className="font-mono text-sm text-[var(--ml-text)]">
                    {identity.canonicalId}
                  </p>
                  <p className="mt-1 text-sm ml-text-muted">
                    {t('inspector.edges')}: {identity.edgeCount}
                  </p>
                  <ul className="mt-2 space-y-1 text-sm text-[var(--ml-text)]">
                    {identity.edges.slice(0, 8).map((edge) => (
                      <li key={`${edge.from}->${edge.to}`} className="font-mono">
                        {edge.from} → {edge.to} · {edge.method} ·{' '}
                        {Math.round(edge.confidence * 100)}%
                      </li>
                    ))}
                  </ul>
                  {identity.warnings.length > 0 ? (
                    <ul
                      className="mt-2 space-y-1 text-sm text-[var(--ml-warning)]"
                      role="status"
                    >
                      {identity.warnings.map((warning) => (
                        <li key={`${warning.code}-${warning.params?.from ?? ''}-${warning.params?.providers ?? ''}`}>
                          {t(`inspector.identityWarning.${warning.code}`, {
                            ...warning.params,
                            defaultValue: warning.code,
                          })}
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </SectionCard>
              ) : null}

              <SectionCard title={t('inspector.fields')}>
                <ul className="space-y-3">
                  {FIELD_KEYS.map((key) => {
                    const field = report.fields[key];
                    if (!field) return null;
                    return (
                      <li
                        key={key}
                        className="border-b border-[var(--ml-border)] pb-3 last:border-b-0"
                      >
                        <div className="flex flex-wrap items-baseline justify-between gap-2">
                          <span className="font-medium text-[var(--ml-text)]">
                            {t(`inspector.fields.${key}`)}
                          </span>
                          <span className="font-mono text-sm text-[var(--ml-text)]">
                            {formatValue(field.value)}
                          </span>
                        </div>
                        <dl className="mt-1 grid gap-1 text-sm ml-text-muted sm:grid-cols-2">
                          <div>
                            {t('inspector.provider')}:{' '}
                            {field.selectedProvider ?? empty}
                          </div>
                          <div>
                            {t('inspector.confidence')}:{' '}
                            {Math.round((field.confidence ?? 0) * 100)}%
                          </div>
                          <div>
                            {t('inspector.locale')}:{' '}
                            {field.selectedLocale ?? field.requestedLocale ?? empty}
                          </div>
                          <div>
                            {t('inspector.fallback')}:{' '}
                            {field.fallbackUsed
                              ? t('inspector.yes')
                              : t('inspector.no')}
                          </div>
                          <div className="sm:col-span-2">
                            {t('inspector.attempted')}:{' '}
                            {field.attemptedProviders.join(' → ')}
                          </div>
                          {field.attempts && field.attempts.length > 0 ? (
                            <div className="sm:col-span-2">
                              <p className="mb-1 font-medium text-[var(--ml-text)]">
                                {t('inspector.attempts')}
                              </p>
                              <ol className="list-decimal space-y-1 ps-5 font-mono text-xs">
                                {field.attempts.map((attempt) => {
                                  const statusLabel = translateAttemptStatus(
                                    attempt.status,
                                    t,
                                  );
                                  const reasonLabel = translateReasonCode(
                                    attempt.reason,
                                    t,
                                    attempt.reasonParams,
                                  );
                                  return (
                                    <li key={`${attempt.stepId}-${attempt.index}`}>
                                      {attempt.provider}
                                      {attempt.resolvedLocale
                                        ? ` · ${attempt.resolvedLocale}`
                                        : ''}{' '}
                                      — {statusLabel}
                                      {reasonLabel ? ` (${reasonLabel})` : ''}
                                    </li>
                                  );
                                })}
                              </ol>
                              {field.effectivePlanHash ? (
                                <p className="mt-1 text-xs">
                                  {t('inspector.plan')}:{' '}
                                  <span className="font-mono">
                                    {field.effectivePlanHash}
                                  </span>
                                </p>
                              ) : null}
                            </div>
                          ) : null}
                          {field.exclusionReason ? (
                            <div className="sm:col-span-2 text-[var(--ml-warning)]">
                              {t('inspector.exclusionLine', {
                                reason:
                                  translateReasonCode(field.exclusionReason, t) ??
                                  field.exclusionReason,
                              })}
                            </div>
                          ) : null}
                        </dl>
                      </li>
                    );
                  })}
                </ul>
              </SectionCard>
            </div>
          ) : null}
        </>
      ) : null}
    </section>
  );
}
