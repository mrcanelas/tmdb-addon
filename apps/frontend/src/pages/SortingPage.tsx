import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ensureStudioSession,
  previewSorting,
  saveGlobalSorting,
  type SortingPlanDraft,
} from '@/lib/api';
import { Button } from '@/components/ui/button';

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

export function SortingPage() {
  const { t } = useTranslation('sorting');
  const [plan, setPlan] = useState<SortingPlanDraft>({
    criteria: [{ field: 'rating', direction: 'desc' }],
    stable: true,
    randomSeedWindow: 'day',
  });
  const [order, setOrder] = useState<string[]>([]);
  const [seedWindow, setSeedWindow] = useState<string>('');
  const [status, setStatus] = useState<'loading' | 'ready' | 'error' | 'saved'>('loading');

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        await ensureStudioSession();
        if (!cancelled) setStatus('ready');
      } catch {
        if (!cancelled) setStatus('error');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function onSave() {
    try {
      const session = await ensureStudioSession();
      await saveGlobalSorting(session.configId, session.editCredential, plan);
      setStatus('saved');
    } catch {
      setStatus('error');
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
      <header className="space-y-2">
        <h1 className="font-display text-3xl font-semibold tracking-tight">
          {t('sorting.title')}
        </h1>
        <p className="max-w-2xl text-muted-foreground">{t('sorting.intro')}</p>
        {status === 'loading' ? (
          <p className="text-sm text-muted-foreground">{t('sorting.bootstrapping')}</p>
        ) : null}
        {status === 'error' ? (
          <p className="text-sm text-amber-700 dark:text-amber-400">{t('sorting.loadError')}</p>
        ) : null}
        {status === 'saved' ? (
          <p className="text-sm text-muted-foreground">{t('sorting.saved')}</p>
        ) : null}
      </header>

      <div className="space-y-4">
        {plan.criteria.map((criterion, index) => (
          <div key={`${criterion.field}-${index}`} className="flex flex-wrap items-end gap-3">
            <label className="grid gap-1 text-sm">
              <span>{t('sorting.field')}</span>
              <select
                className="h-10 rounded-md border border-input bg-background px-3"
                value={criterion.field}
                onChange={(event) => {
                  const field = event.target.value;
                  setPlan((current) => ({
                    ...current,
                    criteria: current.criteria.map((item, itemIndex) =>
                      itemIndex === index ? { ...item, field } : item,
                    ),
                  }));
                }}
              >
                {FIELDS.map((field) => (
                  <option key={field} value={field}>
                    {t(`sorting.fields.${field}`)}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-1 text-sm">
              <span>{t('sorting.direction')}</span>
              <select
                className="h-10 rounded-md border border-input bg-background px-3"
                value={criterion.direction}
                onChange={(event) => {
                  const direction = event.target.value as 'asc' | 'desc';
                  setPlan((current) => ({
                    ...current,
                    criteria: current.criteria.map((item, itemIndex) =>
                      itemIndex === index ? { ...item, direction } : item,
                    ),
                  }));
                }}
              >
                <option value="asc">{t('sorting.dir.asc')}</option>
                <option value="desc">{t('sorting.dir.desc')}</option>
              </select>
            </label>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() =>
                setPlan((current) => ({
                  ...current,
                  criteria: current.criteria.filter((_, itemIndex) => itemIndex !== index),
                }))
              }
            >
              {t('sorting.removeCriterion')}
            </Button>
          </div>
        ))}

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() =>
            setPlan((current) => ({
              ...current,
              criteria: [...current.criteria, { field: 'title', direction: 'asc' }],
            }))
          }
        >
          {t('sorting.addCriterion')}
        </Button>

        <label className="flex items-center gap-3 text-sm">
          <input
            type="checkbox"
            checked={plan.stable}
            onChange={(event) =>
              setPlan((current) => ({ ...current, stable: event.target.checked }))
            }
          />
          {t('sorting.stable')}
        </label>

        <label className="grid max-w-xs gap-1 text-sm">
          <span>{t('sorting.seedWindow')}</span>
          <select
            className="h-10 rounded-md border border-input bg-background px-3"
            value={plan.randomSeedWindow ?? 'day'}
            onChange={(event) =>
              setPlan((current) => ({
                ...current,
                randomSeedWindow: event.target.value as SortingPlanDraft['randomSeedWindow'],
              }))
            }
          >
            <option value="request">{t('sorting.window.request')}</option>
            <option value="hour">{t('sorting.window.hour')}</option>
            <option value="day">{t('sorting.window.day')}</option>
            <option value="week">{t('sorting.window.week')}</option>
          </select>
        </label>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button type="button" onClick={() => void onSave()}>
          {t('sorting.save')}
        </Button>
        <Button type="button" variant="outline" onClick={() => void onPreview()}>
          {t('sorting.preview')}
        </Button>
      </div>

      {order.length > 0 ? (
        <div className="space-y-2">
          <h2 className="font-semibold">{t('sorting.order')}</h2>
          {seedWindow ? (
            <p className="font-mono text-xs text-muted-foreground">{seedWindow}</p>
          ) : null}
          <ol className="space-y-1 text-sm">
            {order.map((id, index) => (
              <li key={id}>
                {index + 1}. {id}
              </li>
            ))}
          </ol>
        </div>
      ) : null}
    </section>
  );
}
