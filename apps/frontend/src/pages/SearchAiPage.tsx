import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  applyAiProposal,
  ensureStudioSession,
  runCombinedSearch,
  runRankedList,
  runSmartDiscovery,
} from '@/lib/api';
import { Button } from '@metalayer/shared-ui';
import { PageHeader } from '@/components/metalayer/PageHeader';
import { SectionCard } from '@/components/metalayer/SectionCard';
import { LoadingState } from '@/components/metalayer/LoadingState';
import { ErrorState } from '@/components/metalayer/ErrorState';

const INPUT_CLASS =
  'w-full max-w-xl rounded-md border border-[var(--ml-border)] bg-[var(--ml-surface)] px-3 py-2 text-[var(--ml-text)]';

export function SearchAiPage() {
  const { t } = useTranslation(['searchAi', 'common']);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [query, setQuery] = useState(() => t('searchAi.seed.combinedQuery'));
  const [hits, setHits] = useState<string[]>([]);
  const [discoveryPrompt, setDiscoveryPrompt] = useState(() =>
    t('searchAi.seed.discoveryPrompt'),
  );
  const [rankedPrompt, setRankedPrompt] = useState(() =>
    t('searchAi.seed.rankedPrompt'),
  );
  const [planSummary, setPlanSummary] = useState<string | null>(null);
  const [explanation, setExplanation] = useState<string | null>(null);
  const [unresolved, setUnresolved] = useState<string[]>([]);
  const [duplicates, setDuplicates] = useState<number>(0);
  const [proposalId, setProposalId] = useState<string | null>(null);
  const [applied, setApplied] = useState(false);

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

  async function onCombined() {
    setBusy(true);
    setActionError(null);
    try {
      const session = await ensureStudioSession();
      const result = await runCombinedSearch(
        session.configId,
        session.editCredential,
        query,
      );
      setHits(
        result.hits.map((hit) =>
          t('searchAi.hitItem', { title: hit.title, provider: hit.provider }),
        ),
      );
    } catch {
      setActionError(t('searchAi.actionError'));
    } finally {
      setBusy(false);
    }
  }

  async function onDiscovery() {
    setBusy(true);
    setActionError(null);
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
    } catch {
      setActionError(t('searchAi.actionError'));
    } finally {
      setBusy(false);
    }
  }

  async function onRanked() {
    setBusy(true);
    setActionError(null);
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
    } catch {
      setActionError(t('searchAi.actionError'));
    } finally {
      setBusy(false);
    }
  }

  async function onConfirm() {
    if (!proposalId) return;
    setBusy(true);
    setActionError(null);
    try {
      const session = await ensureStudioSession();
      await applyAiProposal(session.configId, session.editCredential, {
        proposalId,
        confirm: true,
      });
      setApplied(true);
      setProposalId(null);
    } catch {
      setActionError(t('searchAi.applyError'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="space-y-6">
      <PageHeader
        title={t('searchAi.title')}
        description={t('searchAi.intro')}
      />

      {status === 'loading' ? (
        <LoadingState label={t('searchAi.bootstrapping')} />
      ) : null}

      {status === 'error' ? (
        <ErrorState
          message={t('searchAi.sessionError')}
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

          <SectionCard title={t('searchAi.combined')}>
            <div className="space-y-3">
              <label className="block space-y-1 text-sm text-[var(--ml-text)]">
                <span>{t('searchAi.combinedQuery')}</span>
                <input
                  className={INPUT_CLASS}
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                />
              </label>
              <Button
                type="button"
                isDisabled={busy}
                onPress={() => {
                  void onCombined();
                }}
              >
                {t('searchAi.combinedRun')}
              </Button>
              {hits.length > 0 ? (
                <p className="text-sm text-[var(--ml-text)]" role="status">
                  {t('searchAi.hitsLine', { list: hits.join(', ') })}
                </p>
              ) : null}
            </div>
          </SectionCard>

          <SectionCard title={t('searchAi.discovery')}>
            <div className="space-y-3">
              <label className="block space-y-1 text-sm text-[var(--ml-text)]">
                <span>{t('searchAi.discoveryPrompt')}</span>
                <textarea
                  className={`min-h-20 ${INPUT_CLASS}`}
                  value={discoveryPrompt}
                  onChange={(event) => setDiscoveryPrompt(event.target.value)}
                />
              </label>
              <Button
                type="button"
                isDisabled={busy}
                onPress={() => {
                  void onDiscovery();
                }}
              >
                {t('searchAi.discoveryRun')}
              </Button>
              {planSummary ? (
                <pre className="max-w-xl overflow-auto text-xs ml-text-muted">
                  {t('searchAi.planBlock', { plan: planSummary })}
                </pre>
              ) : null}
            </div>
          </SectionCard>

          <SectionCard title={t('searchAi.ranked')}>
            <div className="space-y-3">
              <label className="block space-y-1 text-sm text-[var(--ml-text)]">
                <span>{t('searchAi.rankedPrompt')}</span>
                <textarea
                  className={`min-h-20 ${INPUT_CLASS}`}
                  value={rankedPrompt}
                  onChange={(event) => setRankedPrompt(event.target.value)}
                />
              </label>
              <Button
                type="button"
                isDisabled={busy}
                onPress={() => {
                  void onRanked();
                }}
              >
                {t('searchAi.rankedRun')}
              </Button>
              {explanation ? (
                <p className="text-sm text-[var(--ml-text)]">
                  {t('searchAi.explanationLine', { text: explanation })}
                </p>
              ) : null}
              {unresolved.length > 0 ? (
                <p className="text-sm text-[var(--ml-text)]">
                  {t('searchAi.unresolvedLine', {
                    list: unresolved.join(', '),
                  })}
                </p>
              ) : null}
              {duplicates > 0 ? (
                <p className="text-sm text-[var(--ml-text)]">
                  {t('searchAi.duplicatesLine', { count: duplicates })}
                </p>
              ) : null}
            </div>
          </SectionCard>

          {proposalId ? (
            <SectionCard title={t('searchAi.proposalTitle')}>
              <p className="mb-3 text-sm ml-text-muted">{t('searchAi.requiresConfirm')}</p>
              <Button
                type="button"
                isDisabled={busy}
                onPress={() => {
                  void onConfirm();
                }}
              >
                {t('searchAi.confirmApply')}
              </Button>
            </SectionCard>
          ) : null}

          {applied ? (
            <p className="text-sm text-[var(--ml-success)]" role="status">
              {t('searchAi.applied')}
            </p>
          ) : null}
        </>
      ) : null}
    </section>
  );
}
