import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { IdentityPreferences } from '@metalayer/config';
import { IdentityPreferencesSchema } from '@metalayer/config';
import { Button } from '@metalayer/shared-ui';
import {
  ensureStudioSession,
  fetchCacheStats,
  fetchIdentityPreferences,
  saveIdentityPreferences,
} from '@/lib/api';
import { PageHeader } from '@/components/metalayer/PageHeader';
import { SectionCard } from '@/components/metalayer/SectionCard';
import { LoadingState } from '@/components/metalayer/LoadingState';
import { ErrorState } from '@/components/metalayer/ErrorState';

const SELECT_CLASS =
  'h-10 rounded-md border border-[var(--ml-border)] bg-[var(--ml-surface)] px-3 text-[var(--ml-text)]';

const PUBLIC_ID_OPTIONS = ['imdb', 'tmdb'] as const;

function manifestHttpUrl(configId: string): string {
  const origin =
    typeof window !== 'undefined' ? window.location.origin : '';
  return `${origin}/c/${configId}/manifest.json`;
}

export function AdvancedPage() {
  const { t } = useTranslation(['advanced', 'common']);
  const [identity, setIdentity] = useState<IdentityPreferences | null>(null);
  const [featureFlags, setFeatureFlags] = useState<Record<string, boolean>>({});
  const [configId, setConfigId] = useState<string | null>(null);
  const [cacheStats, setCacheStats] = useState<{
    hits: number;
    misses: number;
    size: number;
    stales: number;
  } | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'ok' | 'error'>(
    'idle',
  );

  async function load() {
    setStatus('loading');
    try {
      const session = await ensureStudioSession();
      const [prefs, stats] = await Promise.all([
        fetchIdentityPreferences(session.configId, session.editCredential),
        fetchCacheStats(),
      ]);
      const parsed = IdentityPreferencesSchema.parse(prefs.identity);
      setIdentity(parsed);
      setFeatureFlags(prefs.featureFlags ?? {});
      setConfigId(session.configId);
      setCacheStats(stats.cache);
      setStatus('ready');
    } catch {
      setStatus('error');
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function onSave() {
    if (!identity || !configId) return;
    setSaveState('saving');
    try {
      const session = await ensureStudioSession();
      const result = await saveIdentityPreferences(
        session.configId,
        session.editCredential,
        identity,
      );
      setIdentity(IdentityPreferencesSchema.parse(result.identity));
      setSaveState('ok');
    } catch {
      setSaveState('error');
    }
  }

  const flagEntries = Object.entries(featureFlags).sort(([a], [b]) =>
    a.localeCompare(b),
  );

  return (
    <section className="space-y-6">
      <PageHeader
        title={t('advanced.title')}
        description={t('advanced.intro')}
      />

      {status === 'loading' ? (
        <LoadingState label={t('advanced.loading')} />
      ) : null}

      {status === 'error' ? (
        <ErrorState
          message={t('advanced.loadError')}
          retryLabel={t('common:state.retry')}
          onRetry={() => {
            void load();
          }}
        />
      ) : null}

      {status === 'ready' && identity && configId ? (
        <>
          <SectionCard
            title={t('advanced.identity.title')}
            description={t('advanced.identity.description')}
          >
            <label className="flex flex-col gap-2 text-sm">
              <span className="text-muted-foreground">
                {t('advanced.identity.title')}
              </span>
              <select
                className={SELECT_CLASS}
                value={identity.stremioPublicId}
                onChange={(event) => {
                  const value = event.target.value as 'imdb' | 'tmdb';
                  setIdentity({ stremioPublicId: value });
                  setSaveState('idle');
                }}
              >
                {PUBLIC_ID_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {t(`advanced.identity.${option}`)}
                  </option>
                ))}
              </select>
            </label>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <Button
                type="button"
                onPress={() => {
                  void onSave();
                }}
                isDisabled={saveState === 'saving'}
              >
                {saveState === 'saving'
                  ? t('advanced.identity.saving')
                  : t('advanced.identity.save')}
              </Button>
              {saveState === 'ok' ? (
                <p className="text-sm text-emerald-700 dark:text-emerald-400" role="status">
                  {t('advanced.identity.saveOk')}
                </p>
              ) : null}
              {saveState === 'error' ? (
                <p className="text-sm text-amber-700 dark:text-amber-400" role="alert">
                  {t('advanced.identity.saveError')}
                </p>
              ) : null}
            </div>
          </SectionCard>

          <SectionCard
            title={t('advanced.diagnostics.title')}
            description={t('advanced.diagnostics.description')}
          >
            <dl className="grid gap-3 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-muted-foreground">
                  {t('advanced.diagnostics.configId')}
                </dt>
                <dd className="break-all font-mono">{configId}</dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-muted-foreground">
                  {t('advanced.diagnostics.manifest')}
                </dt>
                <dd className="break-all font-mono">
                  {manifestHttpUrl(configId)}
                </dd>
              </div>
              {cacheStats ? (
                <>
                  <div>
                    <dt className="text-muted-foreground">
                      {t('advanced.diagnostics.cacheHits')}
                    </dt>
                    <dd>{cacheStats.hits}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">
                      {t('advanced.diagnostics.cacheMisses')}
                    </dt>
                    <dd>{cacheStats.misses}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">
                      {t('advanced.diagnostics.cacheSize')}
                    </dt>
                    <dd>{cacheStats.size}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">
                      {t('advanced.diagnostics.cacheStales')}
                    </dt>
                    <dd>{cacheStats.stales}</dd>
                  </div>
                </>
              ) : null}
            </dl>
            <div className="mt-4">
              <p className="mb-2 text-sm text-muted-foreground">
                {t('advanced.diagnostics.links')}
              </p>
              <ul className="flex flex-wrap gap-3 text-sm">
                <li>
                  <Link
                    to="/sources"
                    className="text-[var(--ml-accent)] underline-offset-2 hover:underline"
                  >
                    {t('advanced.diagnostics.linkSources')}
                  </Link>
                </li>
                <li>
                  <Link
                    to="/inspector"
                    className="text-[var(--ml-accent)] underline-offset-2 hover:underline"
                  >
                    {t('advanced.diagnostics.linkInspector')}
                  </Link>
                </li>
                <li>
                  <Link
                    to="/save-install"
                    className="text-[var(--ml-accent)] underline-offset-2 hover:underline"
                  >
                    {t('advanced.diagnostics.linkSave')}
                  </Link>
                </li>
              </ul>
            </div>
          </SectionCard>

          <SectionCard
            title={t('advanced.featureFlags.title')}
            description={t('advanced.featureFlags.description')}
          >
            {flagEntries.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {t('advanced.featureFlags.empty')}
              </p>
            ) : (
              <ul className="space-y-2 text-sm">
                {flagEntries.map(([key, enabled]) => (
                  <li
                    key={key}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-[var(--ml-border)] px-3 py-2"
                  >
                    <span className="font-mono">{key}</span>
                    <span className="text-muted-foreground">
                      {enabled
                        ? t('advanced.featureFlags.enabled')
                        : t('advanced.featureFlags.disabled')}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>
        </>
      ) : null}
    </section>
  );
}
