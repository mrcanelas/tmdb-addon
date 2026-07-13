import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ensureStudioSession,
  fetchGlobalSorting,
  previewSorting,
  saveGlobalSorting,
  type SortingPlanDraft,
} from '@/lib/api';
import { Button } from '@metalayer/shared-ui';
import { PageHeader } from '@/components/metalayer/PageHeader';
import { SectionCard } from '@/components/metalayer/SectionCard';
import { LoadingState } from '@/components/metalayer/LoadingState';
import { ErrorState } from '@/components/metalayer/ErrorState';

const SAMPLE_ITEMS = [
  { id: 'b', title: 'Beta', rating: 7.1, popularity: 40 },
  { id: 'a', title: 'Alpha', rating: 8.8, popularity: 90 },
  { id: 'c', title: 'Gamma', rating: 8.1, popularity: 55 },
];

const FIELDS = [
  'sourceOrder',
  'title',
  'rating',
  'voteCount',
  'releaseDate',
  'popularity',
  'random',
] as const;

const SELECT_CLASS =
  'h-10 rounded-md border border-[var(--ml-border)] bg-[var(--ml-surface)] px-3 text-[var(--ml-text)]';

export function SortingPage() {
  const { t } = useTranslation(['sorting', 'common']);
  const [plan, setPlan] = useState<SortingPlanDraft>({
    criteria: [{ field: 'rating', direction: 'desc' }],
    stable: true,
    randomSeedWindow: 'day',
  });
  const [order, setOrder] = useState<string[]>([]);
  const [seedWindow, setSeedWindow] = useState<string>('');
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'ok' | 'error'>(
    'idle',
  );

  async function load() {
    setStatus('loading');
    try {
      const session = await ensureStudioSession();
      const result = await fetchGlobalSorting(
        session.configId,
        session.editCredential,
      );
      if (result.globalSorting?.criteria?.length) {
        setPlan({
          criteria: result.globalSorting.criteria,
          stable: result.globalSorting.stable ?? true,
          randomSeedWindow: result.globalSorting.randomSeedWindow,
        });
      }
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
      await saveGlobalSorting(session.configId, session.editCredential, plan);
      setSaveState('ok');
    } catch {
      setSaveState('error');
    }
  }

  async function onPreview() {
    try {
      const session = await ensureStudioSession();
      const result = await previewSorting(
        session.configId,
        session.editCredential,
        SAMPLE_ITEMS,
        plan,
      );
      setOrder(result.order);
      setSeedWindow(result.seedWindow);
      setStatus('ready');
    } catch {
      setStatus('error');
    }
  }

  return (
    <section className="space-y-6">
      <PageHeader
        title={t('sorting.title')}
        description={t('sorting.intro')}
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
              {t('sorting.preview')}
            </Button>
            <Button
              type="button"
              onPress={() => {
                void onSave();
              }}
              isDisabled={status !== 'ready' || saveState === 'saving'}
            >
              {saveState === 'saving' ? t('sorting.saving') : t('sorting.save')}
            </Button>
          </>
        }
      />

      {status === 'loading' ? (
        <LoadingState label={t('sorting.bootstrapping')} />
      ) : null}

      {status === 'error' ? (
        <ErrorState
          message={t('sorting.loadError')}
          retryLabel={t('state.retry', { ns: 'common' })}
          onRetry={() => {
            void load();
          }}
        />
      ) : null}

      {status === 'ready' ? (
        <>
          <SectionCard title={t('sorting.criteriaTitle')}>
            <div className="space-y-4">
              {plan.criteria.map((criterion, index) => (
                <div
                  key={`${criterion.field}-${index}`}
                  className="flex flex-wrap items-end gap-3"
                >
                  <label className="grid gap-1 text-sm text-[var(--ml-text)]">
                    <span>{t('sorting.field')}</span>
                    <select
                      className={SELECT_CLASS}
                      value={criterion.field}
                      onChange={(event) => {
                        const field = event.target.value;
                        setPlan((current) => ({
                          ...current,
                          criteria: current.criteria.map((item, itemIndex) =>
                            itemIndex === index ? { ...item, field } : item,
                          ),
                        }));
                        setSaveState('idle');
                      }}
                    >
                      {FIELDS.map((field) => (
                        <option key={field} value={field}>
                          {t(`sorting.fields.${field}`)}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="grid gap-1 text-sm text-[var(--ml-text)]">
                    <span>{t('sorting.direction')}</span>
                    <select
                      className={SELECT_CLASS}
                      value={criterion.direction}
                      onChange={(event) => {
                        const direction = event.target.value as 'asc' | 'desc';
                        setPlan((current) => ({
                          ...current,
                          criteria: current.criteria.map((item, itemIndex) =>
                            itemIndex === index ? { ...item, direction } : item,
                          ),
                        }));
                        setSaveState('idle');
                      }}
                    >
                      <option value="asc">{t('sorting.dir.asc')}</option>
                      <option value="desc">{t('sorting.dir.desc')}</option>
                    </select>
                  </label>
                  <Button
                    type="button"
                    size="sm"
                    variant="quiet"
                    aria-label={t('sorting.removeCriterionNamed', {
                      field: t(`sorting.fields.${criterion.field}`),
                    })}
                    onPress={() => {
                      setPlan((current) => ({
                        ...current,
                        criteria: current.criteria.filter(
                          (_, itemIndex) => itemIndex !== index,
                        ),
                      }));
                      setSaveState('idle');
                    }}
                  >
                    {t('sorting.removeCriterion')}
                  </Button>
                </div>
              ))}

              <Button
                type="button"
                variant="outline"
                size="sm"
                onPress={() => {
                  setPlan((current) => ({
                    ...current,
                    criteria: [
                      ...current.criteria,
                      { field: 'title', direction: 'asc' },
                    ],
                  }));
                  setSaveState('idle');
                }}
              >
                {t('sorting.addCriterion')}
              </Button>

              <label className="flex items-center gap-3 text-sm text-[var(--ml-text)]">
                <input
                  type="checkbox"
                  checked={plan.stable}
                  onChange={(event) => {
                    setPlan((current) => ({
                      ...current,
                      stable: event.target.checked,
                    }));
                    setSaveState('idle');
                  }}
                />
                {t('sorting.stable')}
              </label>

              <label className="grid max-w-xs gap-1 text-sm text-[var(--ml-text)]">
                <span>{t('sorting.seedWindow')}</span>
                <select
                  className={SELECT_CLASS}
                  value={plan.randomSeedWindow ?? 'day'}
                  onChange={(event) => {
                    setPlan((current) => ({
                      ...current,
                      randomSeedWindow: event.target
                        .value as SortingPlanDraft['randomSeedWindow'],
                    }));
                    setSaveState('idle');
                  }}
                >
                  <option value="request">{t('sorting.window.request')}</option>
                  <option value="hour">{t('sorting.window.hour')}</option>
                  <option value="day">{t('sorting.window.day')}</option>
                  <option value="week">{t('sorting.window.week')}</option>
                </select>
              </label>
            </div>
          </SectionCard>

          {saveState === 'ok' ? (
            <p className="text-sm text-[var(--ml-success)]" role="status">
              {t('sorting.saved')}
            </p>
          ) : null}
          {saveState === 'error' ? (
            <p className="text-sm text-amber-700 dark:text-amber-400" role="alert">
              {t('sorting.saveError')}
            </p>
          ) : null}

          {order.length > 0 ? (
            <SectionCard title={t('sorting.order')}>
              {seedWindow ? (
                <p className="mb-2 font-mono text-xs ml-text-muted">{seedWindow}</p>
              ) : null}
              <ol className="space-y-1 text-sm text-[var(--ml-text)]">
                {order.map((id, index) => (
                  <li key={id}>
                    {index + 1}. {id}
                  </li>
                ))}
              </ol>
            </SectionCard>
          ) : null}
        </>
      ) : null}
    </section>
  );
}
