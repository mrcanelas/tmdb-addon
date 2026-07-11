import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { PublicSource, SourceTestResult } from '@/lib/api';
import { testSource } from '@/lib/api';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface SourceCardProps {
  source: PublicSource;
}

type TestStatus =
  | { kind: 'idle' }
  | { kind: 'running' }
  | { kind: 'success'; result: SourceTestResult }
  | { kind: 'failure'; result?: SourceTestResult; messageKey: string; code?: string };

export function SourceCard({ source }: SourceCardProps) {
  const { t, i18n } = useTranslation('sources');
  const comingSoon = source.connectionState === 'coming_soon';
  const canTest = source.adapterAvailable && !comingSoon;
  const [apiKey, setApiKey] = useState('');
  const [status, setStatus] = useState<TestStatus>({ kind: 'idle' });

  const capabilityLabels = [
    source.capabilities.supportsLanguage ? t('sources.capability.language') : null,
    source.capabilities.supportsRegion ? t('sources.capability.region') : null,
    source.capabilities.supportsOAuth ? t('sources.capability.oauth') : null,
    source.capabilities.supportsTracking ? t('sources.capability.tracking') : null,
    source.capabilities.supportsSearch ? t('sources.capability.search') : null,
  ].filter(Boolean) as string[];

  async function onTest() {
    if (!canTest || status.kind === 'running') return;
    setStatus({ kind: 'running' });
    try {
      const result = await testSource(source.id, {
        apiKey: apiKey || undefined,
        locale: i18n.language || 'en-US',
      });
      if (result.ok) {
        setStatus({ kind: 'success', result });
      } else {
        setStatus({
          kind: 'failure',
          result,
          messageKey: 'sources.test.failure',
          code: result.error?.providerCode || result.error?.code || 'ERROR',
        });
      }
    } catch {
      setStatus({
        kind: 'failure',
        messageKey: 'sources.test.offline',
        code: 'NETWORK',
      });
    } finally {
      setApiKey('');
    }
  }

  return (
    <article className="rounded-lg border border-border bg-card/80 p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold tracking-tight">{source.name}</h2>
          <div className="flex flex-wrap gap-1.5">
            {source.categories.map((category) => (
              <Badge key={category} variant="outline">
                {t(`sources.category.${category}`)}
              </Badge>
            ))}
            <Badge variant="muted">
              {source.adapterAvailable
                ? t('sources.adapter.available')
                : t('sources.adapter.unavailable')}
            </Badge>
          </div>
        </div>
        <Badge variant={comingSoon ? 'muted' : 'secondary'}>
          {t(`sources.state.${source.connectionState}`)}
        </Badge>
      </div>

      {capabilityLabels.length > 0 ? (
        <ul className="mt-3 flex flex-wrap gap-1.5">
          {capabilityLabels.map((label) => (
            <li key={label}>
              <Badge variant="muted">{label}</Badge>
            </li>
          ))}
        </ul>
      ) : null}

      {canTest && source.requiresCredential ? (
        <label className="mt-4 block space-y-1.5">
          <span className="text-sm text-muted-foreground">
            {t('sources.test.apiKeyLabel')}
          </span>
          <input
            type="password"
            autoComplete="off"
            value={apiKey}
            onChange={(event) => setApiKey(event.target.value)}
            placeholder={t('sources.test.apiKeyPlaceholder')}
            className="flex h-9 w-full max-w-md rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </label>
      ) : null}

      <div className="mt-4 flex flex-wrap gap-2">
        <Button type="button" size="sm" disabled>
          {source.requiresOAuth || source.requiresCredential
            ? t('sources.actions.connect')
            : t('sources.actions.test')}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={!canTest || status.kind === 'running'}
          onClick={() => void onTest()}
        >
          {status.kind === 'running' ? t('sources.test.running') : t('sources.actions.test')}
        </Button>
        <Button type="button" size="sm" variant="ghost" disabled>
          {t('sources.actions.disconnect')}
        </Button>
      </div>

      {status.kind === 'success' ? (
        <p className="mt-3 text-sm text-emerald-700 dark:text-emerald-400" role="status">
          {t('sources.test.success', {
            state: status.result.health?.state ?? 'healthy',
          })}
        </p>
      ) : null}
      {status.kind === 'failure' ? (
        <p className="mt-3 text-sm text-destructive" role="alert">
          {t(status.messageKey, { code: status.code ?? 'ERROR' })}
        </p>
      ) : null}
    </article>
  );
}
