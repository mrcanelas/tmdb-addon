import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  createLocalCorrection,
  deleteLocalCorrection,
  ensureStudioSession,
  fetchCorrections,
  previewCorrections,
  type CorrectionItem,
} from '@/lib/api';
import { Button } from '@/components/ui/button';

export function CorrectionsPage() {
  const { t } = useTranslation('corrections');
  const [local, setLocal] = useState<CorrectionItem[]>([]);
  const [community, setCommunity] = useState<CorrectionItem[]>([]);
  const [resolved, setResolved] = useState<CorrectionItem[]>([]);
  const [previewTitle, setPreviewTitle] = useState<string | null>(null);
  const [overlayCount, setOverlayCount] = useState(0);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');

  async function refresh() {
    const session = await ensureStudioSession();
    const result = await fetchCorrections(session.configId, session.editCredential);
    setLocal(result.local);
    setCommunity(result.community);
    setResolved(result.resolved);
  }

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        await refresh();
        if (!cancelled) setStatus('ready');
      } catch {
        if (!cancelled) setStatus('error');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function onAddLocal() {
    try {
      const session = await ensureStudioSession();
      await createLocalCorrection(session.configId, session.editCredential, {
        target: { provider: 'imdb', id: 'tt0137523', entityKind: 'movie' },
        type: 'title_correction',
        payload: { title: 'Fight Club (Local)' },
        reason: 'Prefer personal title',
        sources: [{ kind: 'manual', label: 'Operator preference' }],
      });
      await refresh();
      setStatus('ready');
    } catch {
      setStatus('error');
    }
  }

  async function onPreview() {
    try {
      const session = await ensureStudioSession();
      const result = await previewCorrections(
        session.configId,
        session.editCredential,
        {
          provider: 'imdb',
          id: 'tt0137523',
          base: { title: 'Provider Title' },
        },
      );
      setPreviewTitle(String(result.applied.title ?? ''));
      setOverlayCount(result.overlays.length);
      setStatus('ready');
    } catch {
      setStatus('error');
    }
  }

  async function onRollback(id: string) {
    try {
      const session = await ensureStudioSession();
      await deleteLocalCorrection(session.configId, session.editCredential, id);
      await refresh();
      setStatus('ready');
    } catch {
      setStatus('error');
    }
  }

  return (
    <section className="space-y-6">
      <header className="space-y-2">
        <h1 className="font-display text-3xl font-semibold tracking-tight">
          {t('corrections.title')}
        </h1>
        <p className="max-w-2xl text-muted-foreground">{t('corrections.intro')}</p>
        {status === 'loading' ? (
          <p className="text-sm text-muted-foreground">{t('corrections.bootstrapping')}</p>
        ) : null}
        {status === 'error' ? (
          <p className="text-sm text-amber-700 dark:text-amber-400">
            {t('corrections.loadError')}
          </p>
        ) : null}
      </header>

      <div className="flex flex-wrap gap-2">
        <Button type="button" onClick={() => void onAddLocal()}>
          {t('corrections.addLocal')}
        </Button>
        <Button type="button" variant="secondary" onClick={() => void onPreview()}>
          {t('corrections.preview')}
        </Button>
      </div>

      {previewTitle !== null ? (
        <p className="text-sm">
          {t('corrections.previewResult', { title: previewTitle })} ·{' '}
          {t('corrections.overlays')}: {overlayCount}
        </p>
      ) : null}

      <CorrectionList
        title={t('corrections.local')}
        items={local}
        emptyLabel={t('corrections.empty')}
        statusLabel={t('corrections.status')}
        scopeLabel={t('corrections.scope')}
        rollbackLabel={t('corrections.rollback')}
        onRollback={onRollback}
      />
      <CorrectionList
        title={t('corrections.resolved')}
        items={resolved}
        emptyLabel={t('corrections.empty')}
        statusLabel={t('corrections.status')}
        scopeLabel={t('corrections.scope')}
      />
      <CorrectionList
        title={t('corrections.community')}
        items={community}
        emptyLabel={t('corrections.empty')}
        statusLabel={t('corrections.status')}
        scopeLabel={t('corrections.scope')}
      />
    </section>
  );
}

function CorrectionList(props: {
  title: string;
  items: CorrectionItem[];
  emptyLabel: string;
  statusLabel: string;
  scopeLabel: string;
  rollbackLabel?: string;
  onRollback?: (id: string) => void;
}) {
  return (
    <div className="space-y-3">
      <h2 className="text-lg font-medium">{props.title}</h2>
      {props.items.length === 0 ? (
        <p className="text-sm text-muted-foreground">{props.emptyLabel}</p>
      ) : (
        <ul className="space-y-2">
          {props.items.map((item) => (
            <li
              key={item.id}
              className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 pb-2"
            >
              <div className="space-y-1">
                <p className="font-medium">
                  {item.type} · {item.target.provider}:{item.target.id}
                </p>
                <p className="text-sm text-muted-foreground">{item.reason}</p>
                <p className="text-xs text-muted-foreground">
                  {props.statusLabel}: {item.status} · {props.scopeLabel}: {item.scope}
                </p>
              </div>
              {props.onRollback && item.scope === 'local' ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => props.onRollback?.(item.id)}
                >
                  {props.rollbackLabel}
                </Button>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
