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
import { PageHeader } from '@/components/metalayer/PageHeader';
import { SectionCard } from '@/components/metalayer/SectionCard';
import { LoadingState } from '@/components/metalayer/LoadingState';
import { ErrorState } from '@/components/metalayer/ErrorState';

const SAMPLE_ITEMS = [
  { id: 'adult-hit', title: 'Adult Hit', rating: 9, adult: true, voteCount: 1000 },
  { id: 'low-rated', title: 'Low Rated', rating: 4.2, adult: false, voteCount: 20 },
  { id: 'keeper', title: 'Keeper', rating: 8.4, adult: false, voteCount: 500 },
];

export function RulesPage() {
  const { t } = useTranslation(['rules', 'common']);
  const [rules, setRules] = useState<RuleSetDraft>({
    excludeAdult: true,
    minimumRating: 7,
  });
  const [warnings, setWarnings] = useState<Array<{ rule: string; reason: string }>>([]);
  const [included, setIncluded] = useState<string[]>([]);
  const [excluded, setExcluded] = useState<string[]>([]);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'ok' | 'error'>(
    'idle',
  );

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
    try {
      const session = await ensureStudioSession();
      const result = await previewRules(
        session.configId,
        session.editCredential,
        SAMPLE_ITEMS,
        rules,
      );
      setIncluded(result.included);
      setExcluded(result.excluded);
      setWarnings(result.warnings);
      setStatus('ready');
    } catch {
      setStatus('error');
    }
  }

  return (
    <section className="space-y-6">
      <PageHeader
        title={t('rules.title')}
        description={t('rules.intro')}
        actions={
          <>
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
          </>
        }
      />

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
              <label className="flex items-center gap-3 text-sm text-[var(--ml-text)]">
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
              <label className="flex items-center gap-3 text-sm text-[var(--ml-text)]">
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
              <label className="flex items-center gap-3 text-sm text-[var(--ml-text)]">
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
              <label className="grid gap-1 text-sm text-[var(--ml-text)]">
                <span>{t('rules.minimumRating')}</span>
                <input
                  type="number"
                  min={0}
                  max={10}
                  step={0.1}
                  aria-describedby="rules-rating-hint"
                  className="h-10 rounded-md border border-[var(--ml-border)] bg-[var(--ml-surface)] px-3 text-[var(--ml-text)]"
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
              <label className="grid gap-1 text-sm text-[var(--ml-text)]">
                <span>{t('rules.minimumVotes')}</span>
                <input
                  type="number"
                  min={0}
                  aria-describedby="rules-votes-hint"
                  className="h-10 rounded-md border border-[var(--ml-border)] bg-[var(--ml-surface)] px-3 text-[var(--ml-text)]"
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
            <p className="text-sm text-[var(--ml-success)]" role="status">
              {t('rules.saved')}
            </p>
          ) : null}
          {saveState === 'error' ? (
            <p className="text-sm text-amber-700 dark:text-amber-400" role="alert">
              {t('rules.saveError')}
            </p>
          ) : null}

          {(included.length > 0 || excluded.length > 0) && (
            <div className="grid gap-4 sm:grid-cols-2">
              <SectionCard title={t('rules.included')}>
                <ul className="space-y-1 text-sm text-[var(--ml-text)]">
                  {included.map((id) => (
                    <li key={id}>{id}</li>
                  ))}
                </ul>
              </SectionCard>
              <SectionCard title={t('rules.excluded')}>
                <ul className="space-y-1 text-sm text-[var(--ml-text)]">
                  {excluded.map((id) => (
                    <li key={id}>{id}</li>
                  ))}
                </ul>
              </SectionCard>
            </div>
          )}

          {warnings.length > 0 ? (
            <SectionCard title={t('rules.warnings')}>
              <ul
                className="space-y-1 text-sm text-amber-700 dark:text-amber-400"
                role="status"
              >
                {warnings.map((warning) => (
                  <li key={warning.rule}>
                    {warning.rule}: {warning.reason}
                  </li>
                ))}
              </ul>
            </SectionCard>
          ) : null}
        </>
      ) : null}
    </section>
  );
}
