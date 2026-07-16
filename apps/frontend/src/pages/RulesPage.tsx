import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ensureStudioSession,
  fetchEffectiveRules,
  previewRules,
  saveGlobalRules,
  type RuleSetDraft,
} from '@/lib/api';
import { Button } from '@metalayer/shared-ui';
import { PageActions } from '@/components/metalayer/PageHeader';
import { usePageHeader } from '@/contexts/page-title';
import { SectionCard } from '@/components/metalayer/SectionCard';
import { LoadingState } from '@/components/metalayer/LoadingState';
import { ErrorState } from '@/components/metalayer/ErrorState';

function buildSampleItems(t: (key: string) => string) {
  return [
    {
      id: 'adult-hit',
      title: t('rules.sample.adult-hit'),
      rating: 9,
      adult: true,
      voteCount: 1000,
    },
    {
      id: 'low-rated',
      title: t('rules.sample.low-rated'),
      rating: 4.2,
      adult: false,
      voteCount: 20,
    },
    {
      id: 'keeper',
      title: t('rules.sample.keeper'),
      rating: 8.4,
      adult: false,
      voteCount: 500,
    },
  ];
}

export function RulesPage() {
  const { t } = useTranslation(['rules', 'common']);
  usePageHeader(t('rules.title'), t('rules.intro'));
  const [rules, setRules] = useState<RuleSetDraft>({
    excludeAdult: true,
    minimumRating: 7,
  });
  const [warnings, setWarnings] = useState<
    Array<{ rule: string; reason: string; fallback?: string }>
  >([]);
  const [included, setIncluded] = useState<string[]>([]);
  const [excluded, setExcluded] = useState<string[]>([]);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'ok' | 'error'>(
    'idle',
  );
  const [previewError, setPreviewError] = useState<string | null>(null);

  async function load() {
    setStatus('loading');
    try {
      const session = await ensureStudioSession();
      const effective = await fetchEffectiveRules(
        session.configId,
        session.editCredential,
      );
      setRules({
        excludeAdult: effective.effective.excludeAdult ?? true,
        digitallyReleasedOnly: effective.effective.digitallyReleasedOnly,
        releasedOnly: effective.effective.releasedOnly,
        minimumRating: effective.effective.minimumRating ?? 7,
        minimumVotes: effective.effective.minimumVotes,
      });
      setWarnings(effective.warnings);
      setStatus('ready');
      setSaveState('idle');
    } catch {
      setStatus('error');
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function onSave() {
    setSaveState('saving');
    try {
      const session = await ensureStudioSession();
      await saveGlobalRules(session.configId, session.editCredential, rules);
      setSaveState('ok');
    } catch {
      setSaveState('error');
    }
  }

  async function onPreview() {
    setPreviewError(null);
    try {
      const session = await ensureStudioSession();
      const result = await previewRules(
        session.configId,
        session.editCredential,
        buildSampleItems(t),
        rules,
      );
      setIncluded(result.included);
      setExcluded(result.excluded);
      setWarnings(result.warnings);
    } catch {
      setPreviewError(t('rules.previewError'));
    }
  }

  return (
    <section className="space-y-6">
      <PageActions>
        <Button
          type="button"
          variant="outline"
          onPress={() => {
            void onPreview();
          }}
          isDisabled={status !== 'ready'}
        >
          {t('rules.preview')}
        </Button>
        <Button
          type="button"
          onPress={() => {
            void onSave();
          }}
          isDisabled={status !== 'ready' || saveState === 'saving'}
        >
          {saveState === 'saving' ? t('rules.saving') : t('rules.save')}
        </Button>
      </PageActions>

      {status === 'loading' ? (
        <LoadingState label={t('rules.bootstrapping')} />
      ) : null}

      {status === 'error' ? (
        <ErrorState
          message={t('rules.loadError')}
          retryLabel={t('state.retry', { ns: 'common' })}
          onRetry={() => {
            void load();
          }}
        />
      ) : null}

      {status === 'ready' ? (
        <>
          <p className="text-sm ml-text-muted">{t('rules.inheritance')}</p>

          <SectionCard title={t('rules.filtersTitle')}>
            <fieldset className="relative grid max-w-xl gap-4 border-0 p-0">
              <legend className="absolute h-px w-px overflow-hidden whitespace-nowrap border-0 p-0 [clip:rect(0,0,0,0)]">
                {t('rules.filtersLegend')}
              </legend>
              <label className="flex items-center gap-3 text-sm text-[var(--foreground)]">
                <input
                  type="checkbox"
                  checked={Boolean(rules.excludeAdult)}
                  onChange={(event) => {
                    setRules((current) => ({
                      ...current,
                      excludeAdult: event.target.checked,
                    }));
                    setSaveState('idle');
                  }}
                />
                {t('rules.excludeAdult')}
              </label>
              <label className="flex items-center gap-3 text-sm text-[var(--foreground)]">
                <input
                  type="checkbox"
                  checked={Boolean(rules.digitallyReleasedOnly)}
                  onChange={(event) => {
                    setRules((current) => ({
                      ...current,
                      digitallyReleasedOnly: event.target.checked,
                    }));
                    setSaveState('idle');
                  }}
                />
                {t('rules.digitallyReleasedOnly')}
              </label>
              <label className="flex items-center gap-3 text-sm text-[var(--foreground)]">
                <input
                  type="checkbox"
                  checked={Boolean(rules.releasedOnly)}
                  onChange={(event) => {
                    setRules((current) => ({
                      ...current,
                      releasedOnly: event.target.checked,
                    }));
                    setSaveState('idle');
                  }}
                />
                {t('rules.releasedOnly')}
              </label>
              <label className="grid gap-1 text-sm text-[var(--foreground)]">
                <span>{t('rules.minimumRating')}</span>
                <input
                  type="number"
                  min={0}
                  max={10}
                  step={0.1}
                  aria-describedby="rules-rating-hint"
                  className="h-10 rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 text-[var(--foreground)]"
                  value={rules.minimumRating ?? ''}
                  onChange={(event) => {
                    setRules((current) => ({
                      ...current,
                      minimumRating: event.target.value
                        ? Number(event.target.value)
                        : undefined,
                    }));
                    setSaveState('idle');
                  }}
                />
                <span id="rules-rating-hint" className="text-xs ml-text-muted">
                  {t('rules.minimumRatingHint')}
                </span>
              </label>
              <label className="grid gap-1 text-sm text-[var(--foreground)]">
                <span>{t('rules.minimumVotes')}</span>
                <input
                  type="number"
                  min={0}
                  aria-describedby="rules-votes-hint"
                  className="h-10 rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 text-[var(--foreground)]"
                  value={rules.minimumVotes ?? ''}
                  onChange={(event) => {
                    setRules((current) => ({
                      ...current,
                      minimumVotes: event.target.value
                        ? Number(event.target.value)
                        : undefined,
                    }));
                    setSaveState('idle');
                  }}
                />
                <span id="rules-votes-hint" className="text-xs ml-text-muted">
                  {t('rules.minimumVotesHint')}
                </span>
              </label>
            </fieldset>
          </SectionCard>

          {saveState === 'ok' ? (
            <p className="text-sm text-[var(--success)]" role="status">
              {t('rules.saved')}
            </p>
          ) : null}
          {saveState === 'error' ? (
            <p className="text-sm text-[var(--danger)]" role="alert">
              {t('rules.saveError')}
            </p>
          ) : null}
          {previewError ? (
            <p className="text-sm text-[var(--danger)]" role="alert">
              {previewError}
            </p>
          ) : null}

          {(included.length > 0 || excluded.length > 0) && (
            <div className="grid gap-4 sm:grid-cols-2">
              <SectionCard title={t('rules.included')}>
                <ul className="space-y-1 text-sm text-[var(--foreground)]">
                  {included.map((id) => (
                    <li key={id}>
                      {t(`rules.sample.${id}`, { defaultValue: id })}
                    </li>
                  ))}
                </ul>
              </SectionCard>
              <SectionCard title={t('rules.excluded')}>
                <ul className="space-y-1 text-sm text-[var(--foreground)]">
                  {excluded.map((id) => (
                    <li key={id}>
                      {t(`rules.sample.${id}`, { defaultValue: id })}
                    </li>
                  ))}
                </ul>
              </SectionCard>
            </div>
          )}

          {warnings.length > 0 ? (
            <SectionCard title={t('rules.warnings')}>
              <ul
                className="space-y-1 text-sm text-[var(--warning)]"
                role="status"
              >
                {warnings.map((warning) => {
                  const ruleLabel = t(`rules.rule.${warning.rule}`, {
                    defaultValue: warning.rule,
                  });
                  const reasonLabel = t(`rules.warning.${warning.reason}`, {
                    defaultValue: warning.reason,
                  });
                  const fallbackLabel = warning.fallback
                    ? t(`rules.fallback.${warning.fallback}`, {
                        defaultValue: warning.fallback,
                      })
                    : null;
                  return (
                    <li key={`${warning.rule}-${warning.reason}`}>
                      {ruleLabel}: {reasonLabel}
                      {fallbackLabel ? ` (${fallbackLabel})` : ''}
                    </li>
                  );
                })}
              </ul>
            </SectionCard>
          ) : null}
        </>
      ) : null}
    </section>
  );
}
