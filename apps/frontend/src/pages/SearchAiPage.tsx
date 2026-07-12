import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  applyAiProposal,
  ensureStudioSession,
  runCombinedSearch,
  runRankedList,
  runSmartDiscovery,
} from '@/lib/api';
import { Button } from '@/components/ui/button';

export function SearchAiPage() {
  const { t } = useTranslation('searchAi');
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [query, setQuery] = useState('Fight');
  const [hits, setHits] = useState<string[]>([]);
  const [discoveryPrompt, setDiscoveryPrompt] = useState(
    'Investigation movies without horror and under two hours.',
  );
  const [rankedPrompt, setRankedPrompt] = useState(
    'Best science-fiction movies of all time.',
  );
  const [planSummary, setPlanSummary] = useState<string | null>(null);
  const [explanation, setExplanation] = useState<string | null>(null);
  const [unresolved, setUnresolved] = useState<string[]>([]);
  const [duplicates, setDuplicates] = useState<number>(0);
  const [proposalId, setProposalId] = useState<string | null>(null);
  const [applied, setApplied] = useState(false);

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

  async function onCombined() {
    try {
      const session = await ensureStudioSession();
      const result = await runCombinedSearch(
        session.configId,
        session.editCredential,
        query,
      );
      setHits(result.hits.map((hit) => `${hit.title} (${hit.provider})`));
      setStatus('ready');
    } catch {
      setStatus('error');
    }
  }

  async function onDiscovery() {
    try {
      const session = await ensureStudioSession();
      const result = await runSmartDiscovery(
        session.configId,
        session.editCredential,
        discoveryPrompt,
      );
      setPlanSummary(
        JSON.stringify(
          {
            mediaType: result.plan.mediaType,
            includeGenres: result.plan.includeGenres,
            excludeGenres: result.plan.excludeGenres,
            runtimeMax: result.plan.runtimeMax,
          },
          null,
          2,
        ),
      );
      setExplanation(result.proposal.explanation.interpretedIntent);
      setProposalId(result.proposal.id);
      setApplied(false);
      setStatus('ready');
    } catch {
      setStatus('error');
    }
  }

  async function onRanked() {
    try {
      const session = await ensureStudioSession();
      const result = await runRankedList(
        session.configId,
        session.editCredential,
        rankedPrompt,
      );
      setUnresolved(result.unresolved.map((item) => item.title));
      setDuplicates(result.duplicates.length);
      setExplanation(result.explanation.interpretedIntent);
      setProposalId(result.proposal.id);
      setApplied(false);
      setStatus('ready');
    } catch {
      setStatus('error');
    }
  }

  async function onConfirm() {
    if (!proposalId) return;
    try {
      const session = await ensureStudioSession();
      await applyAiProposal(session.configId, session.editCredential, {
        proposalId,
        confirm: true,
      });
      setApplied(true);
      setProposalId(null);
      setStatus('ready');
    } catch {
      setStatus('error');
    }
  }

  return (
    <section className="space-y-8">
      <header className="space-y-2">
        <h1 className="font-display text-3xl font-semibold tracking-tight">
          {t('searchAi.title')}
        </h1>
        <p className="max-w-2xl text-muted-foreground">{t('searchAi.intro')}</p>
        {status === 'loading' ? (
          <p className="text-sm text-muted-foreground">{t('searchAi.bootstrapping')}</p>
        ) : null}
        {status === 'error' ? (
          <p className="text-sm text-amber-700 dark:text-amber-400">
            {t('searchAi.loadError')}
          </p>
        ) : null}
      </header>

      <div className="space-y-3">
        <h2 className="text-lg font-medium">{t('searchAi.combined')}</h2>
        <label className="block space-y-1 text-sm">
          <span>{t('searchAi.combinedQuery')}</span>
          <input
            className="w-full max-w-xl border border-border bg-background px-3 py-2"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>
        <Button type="button" onClick={() => void onCombined()}>
          {t('searchAi.combinedRun')}
        </Button>
        {hits.length > 0 ? (
          <p className="text-sm">
            {t('searchAi.hits')}: {hits.join(', ')}
          </p>
        ) : null}
      </div>

      <div className="space-y-3">
        <h2 className="text-lg font-medium">{t('searchAi.discovery')}</h2>
        <label className="block space-y-1 text-sm">
          <span>{t('searchAi.discoveryPrompt')}</span>
          <textarea
            className="min-h-20 w-full max-w-xl border border-border bg-background px-3 py-2"
            value={discoveryPrompt}
            onChange={(event) => setDiscoveryPrompt(event.target.value)}
          />
        </label>
        <Button type="button" onClick={() => void onDiscovery()}>
          {t('searchAi.discoveryRun')}
        </Button>
        {planSummary ? (
          <pre className="max-w-xl overflow-auto text-xs text-muted-foreground">
            {t('searchAi.plan')}
            {'\n'}
            {planSummary}
          </pre>
        ) : null}
      </div>

      <div className="space-y-3">
        <h2 className="text-lg font-medium">{t('searchAi.ranked')}</h2>
        <label className="block space-y-1 text-sm">
          <span>{t('searchAi.rankedPrompt')}</span>
          <textarea
            className="min-h-20 w-full max-w-xl border border-border bg-background px-3 py-2"
            value={rankedPrompt}
            onChange={(event) => setRankedPrompt(event.target.value)}
          />
        </label>
        <Button type="button" onClick={() => void onRanked()}>
          {t('searchAi.rankedRun')}
        </Button>
        {explanation ? (
          <p className="text-sm">
            {t('searchAi.explanation')}: {explanation}
          </p>
        ) : null}
        {unresolved.length > 0 ? (
          <p className="text-sm">
            {t('searchAi.unresolved')}: {unresolved.join(', ')}
          </p>
        ) : null}
        {duplicates > 0 ? (
          <p className="text-sm">
            {t('searchAi.duplicates')}: {duplicates}
          </p>
        ) : null}
      </div>

      {proposalId ? (
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">{t('searchAi.requiresConfirm')}</p>
          <Button type="button" onClick={() => void onConfirm()}>
            {t('searchAi.confirmApply')}
          </Button>
        </div>
      ) : null}
      {applied ? <p className="text-sm">{t('searchAi.applied')}</p> : null}
    </section>
  );
}
