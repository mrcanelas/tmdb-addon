import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ensureStudioSession,
  fetchEffectiveRules,
  previewRules,
  saveGlobalRules,
  type RuleSetDraft,
} from '@/lib/api';
import { Button } from '@/components/ui/button';

const SAMPLE_ITEMS = [
  { id: 'adult-hit', title: 'Adult Hit', rating: 9, adult: true, voteCount: 1000 },
  { id: 'low-rated', title: 'Low Rated', rating: 4.2, adult: false, voteCount: 20 },
  { id: 'keeper', title: 'Keeper', rating: 8.4, adult: false, voteCount: 500 },
];

export function RulesPage() {
  const { t } = useTranslation('rules');
  const [rules, setRules] = useState<RuleSetDraft>({
    excludeAdult: true,
    minimumRating: 7,
  });
  const [warnings, setWarnings] = useState<Array<{ rule: string; reason: string }>>([]);
  const [included, setIncluded] = useState<string[]>([]);
  const [excluded, setExcluded] = useState<string[]>([]);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error' | 'saved'>('loading');

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const session = await ensureStudioSession();
        const effective = await fetchEffectiveRules(session.configId, session.editCredential);
        if (cancelled) return;
        setRules({
          excludeAdult: effective.effective.excludeAdult ?? true,
          digitallyReleasedOnly: effective.effective.digitallyReleasedOnly,
          releasedOnly: effective.effective.releasedOnly,
          minimumRating: effective.effective.minimumRating ?? 7,
          minimumVotes: effective.effective.minimumVotes,
        });
        setWarnings(effective.warnings);
        setStatus('ready');
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
      await saveGlobalRules(session.configId, session.editCredential, rules);
      setStatus('saved');
    } catch {
      setStatus('error');
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
      <header className="space-y-2">
        <h1 className="font-display text-3xl font-semibold tracking-tight">{t('rules.title')}</h1>
        <p className="max-w-2xl text-muted-foreground">{t('rules.intro')}</p>
        <p className="text-sm text-muted-foreground">{t('rules.inheritance')}</p>
        {status === 'loading' ? (
          <p className="text-sm text-muted-foreground">{t('rules.bootstrapping')}</p>
        ) : null}
        {status === 'error' ? (
          <p className="text-sm text-amber-700 dark:text-amber-400">{t('rules.loadError')}</p>
        ) : null}
        {status === 'saved' ? (
          <p className="text-sm text-muted-foreground">{t('rules.saved')}</p>
        ) : null}
      </header>

      <div className="grid max-w-xl gap-4">
        <label className="flex items-center gap-3 text-sm">
          <input
            type="checkbox"
            checked={Boolean(rules.excludeAdult)}
            onChange={(event) =>
              setRules((current) => ({ ...current, excludeAdult: event.target.checked }))
            }
          />
          {t('rules.excludeAdult')}
        </label>
        <label className="flex items-center gap-3 text-sm">
          <input
            type="checkbox"
            checked={Boolean(rules.digitallyReleasedOnly)}
            onChange={(event) =>
              setRules((current) => ({
                ...current,
                digitallyReleasedOnly: event.target.checked,
              }))
            }
          />
          {t('rules.digitallyReleasedOnly')}
        </label>
        <label className="flex items-center gap-3 text-sm">
          <input
            type="checkbox"
            checked={Boolean(rules.releasedOnly)}
            onChange={(event) =>
              setRules((current) => ({ ...current, releasedOnly: event.target.checked }))
            }
          />
          {t('rules.releasedOnly')}
        </label>
        <label className="grid gap-1 text-sm">
          <span>{t('rules.minimumRating')}</span>
          <input
            type="number"
            min={0}
            max={10}
            step={0.1}
            className="h-10 rounded-md border border-input bg-background px-3"
            value={rules.minimumRating ?? ''}
            onChange={(event) =>
              setRules((current) => ({
                ...current,
                minimumRating: event.target.value ? Number(event.target.value) : undefined,
              }))
            }
          />
        </label>
        <label className="grid gap-1 text-sm">
          <span>{t('rules.minimumVotes')}</span>
          <input
            type="number"
            min={0}
            className="h-10 rounded-md border border-input bg-background px-3"
            value={rules.minimumVotes ?? ''}
            onChange={(event) =>
              setRules((current) => ({
                ...current,
                minimumVotes: event.target.value ? Number(event.target.value) : undefined,
              }))
            }
          />
        </label>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button type="button" onClick={() => void onSave()}>
          {t('rules.save')}
        </Button>
        <Button type="button" variant="outline" onClick={() => void onPreview()}>
          {t('rules.preview')}
        </Button>
      </div>

      {(included.length > 0 || excluded.length > 0) && (
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <h2 className="mb-2 font-semibold">{t('rules.included')}</h2>
            <ul className="space-y-1 text-sm">
              {included.map((id) => (
                <li key={id}>{id}</li>
              ))}
            </ul>
          </div>
          <div>
            <h2 className="mb-2 font-semibold">{t('rules.excluded')}</h2>
            <ul className="space-y-1 text-sm">
              {excluded.map((id) => (
                <li key={id}>{id}</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {warnings.length > 0 ? (
        <div>
          <h2 className="mb-2 font-semibold">{t('rules.warnings')}</h2>
          <ul className="space-y-1 text-sm text-amber-700 dark:text-amber-400">
            {warnings.map((warning) => (
              <li key={warning.rule}>
                {warning.rule}: {warning.reason}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
