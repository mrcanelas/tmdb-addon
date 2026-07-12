import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ensureStudioSession,
  inspectMetadata,
  type MetaInspectorReport,
} from '@/lib/api';
import { Button } from '@/components/ui/button';

const FIELD_KEYS = [
  'title',
  'originalTitle',
  'description',
  'poster',
  'background',
  'rating',
  'voteCount',
  'releaseDate',
  'externalIds',
] as const;

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
  rating: [
    { provider: 'imdb', value: 8.8, confidence: 0.95 },
    { provider: 'tmdb', value: 8.4, confidence: 0.6 },
  ],
  voteCount: [{ provider: 'tmdb', value: 28000 }],
  releaseDate: [{ provider: 'tmdb', value: '1999-10-15' }],
  externalIds: [{ provider: 'tmdb', value: { tmdb: 550, imdb: 'tt0137523' } }],
};

function formatValue(value: unknown): string {
  if (value === null || value === undefined) return '—';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

export function InspectorPage() {
  const { t } = useTranslation('inspector');
  const [publicId, setPublicId] = useState('tt0137523');
  const [report, setReport] = useState<MetaInspectorReport | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');

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

  async function onDryRun() {
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
      setStatus('ready');
    } catch {
      setStatus('error');
    }
  }

  async function onInspectLive() {
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
      setStatus('ready');
    } catch {
      setStatus('error');
    }
  }

  return (
    <section className="space-y-6">
      <header className="space-y-2">
        <h1 className="font-display text-3xl font-semibold tracking-tight">
          {t('inspector.title')}
        </h1>
        <p className="max-w-2xl text-muted-foreground">{t('inspector.intro')}</p>
        {status === 'loading' ? (
          <p className="text-sm text-muted-foreground">{t('inspector.bootstrapping')}</p>
        ) : null}
        {status === 'error' ? (
          <p className="text-sm text-amber-700 dark:text-amber-400">{t('inspector.loadError')}</p>
        ) : null}
      </header>

      <div className="flex flex-wrap items-end gap-3">
        <label className="flex min-w-[16rem] flex-1 flex-col gap-1 text-sm">
          <span>{t('inspector.idLabel')}</span>
          <input
            className="rounded-md border border-input bg-background px-3 py-2"
            value={publicId}
            onChange={(event) => setPublicId(event.target.value)}
          />
        </label>
        <Button type="button" onClick={() => void onDryRun()}>
          {t('inspector.dryRun')}
        </Button>
        <Button type="button" variant="outline" onClick={() => void onInspectLive()}>
          {t('inspector.inspect')}
        </Button>
      </div>

      {report ? (
        <div className="space-y-6">
          <div className="space-y-2">
            <h2 className="text-lg font-medium">{t('inspector.identity')}</h2>
            <p className="text-sm text-muted-foreground">
              {report.identity.publicId ?? '—'} · {report.identity.mediaType ?? '—'}
            </p>
            <p className="font-mono text-sm">
              {formatValue(report.identity.matches)}
            </p>
            <p className="text-sm">
              {t('inspector.displayTitle')}: {report.fields.displayTitle ?? '—'}
            </p>
            <p className="text-sm text-muted-foreground">
              {t('inspector.timing', { ms: report.timingMs })}
            </p>
          </div>

          <div className="space-y-3">
            <h2 className="text-lg font-medium">{t('inspector.fields')}</h2>
            <ul className="space-y-3">
              {FIELD_KEYS.map((key) => {
                const field = report.fields[key];
                return (
                  <li key={key} className="border-b border-border/60 pb-3">
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <span className="font-medium">
                        {t(`inspector.fields.${key}`)}
                      </span>
                      <span className="font-mono text-sm">
                        {formatValue(field.value)}
                      </span>
                    </div>
                    <dl className="mt-1 grid gap-1 text-sm text-muted-foreground sm:grid-cols-2">
                      <div>
                        {t('inspector.provider')}: {field.selectedProvider ?? '—'}
                      </div>
                      <div>
                        {t('inspector.confidence')}:{' '}
                        {Math.round((field.confidence ?? 0) * 100)}%
                      </div>
                      <div>
                        {t('inspector.locale')}:{' '}
                        {field.selectedLocale ?? field.requestedLocale ?? '—'}
                      </div>
                      <div>
                        {t('inspector.fallback')}: {field.fallbackUsed ? 'yes' : 'no'}
                      </div>
                      <div className="sm:col-span-2">
                        {t('inspector.attempted')}:{' '}
                        {field.attemptedProviders.join(' → ')}
                      </div>
                      {field.exclusionReason ? (
                        <div className="sm:col-span-2 text-amber-700 dark:text-amber-400">
                          {t('inspector.exclusion')}: {field.exclusionReason}
                        </div>
                      ) : null}
                    </dl>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      ) : null}
    </section>
  );
}
