import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Input } from '@metalayer/shared-ui';
import type { PublicSource, SourceTestResult } from '@/lib/api';
import { useTestSourceMutation } from '@/api/hooks/use-sources';
import {
  sourceTestFormSchema,
  type SourceTestFormValues,
} from '@/api/schemas/source-test';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface SourceCardProps {
  source: PublicSource;
}

type TestStatus =
  | { kind: 'idle' }
  | { kind: 'success'; result: SourceTestResult }
  | { kind: 'failure'; result?: SourceTestResult; messageKey: string; code?: string };

export function SourceCard({ source }: SourceCardProps) {
  const { t, i18n } = useTranslation('sources');
  const comingSoon = source.connectionState === 'coming_soon';
  const canTest = source.adapterAvailable && !comingSoon;
  const [status, setStatus] = useState<TestStatus>({ kind: 'idle' });
  const testMutation = useTestSourceMutation(source.id);

  const form = useForm<SourceTestFormValues>({
    resolver: zodResolver(sourceTestFormSchema),
    defaultValues: { apiKey: '' },
  });

  const capabilityLabels = [
    source.capabilities.supportsLanguage ? t('sources.capability.language') : null,
    source.capabilities.supportsRegion ? t('sources.capability.region') : null,
    source.capabilities.supportsOAuth ? t('sources.capability.oauth') : null,
    source.capabilities.supportsTracking ? t('sources.capability.tracking') : null,
    source.capabilities.supportsSearch ? t('sources.capability.search') : null,
  ].filter(Boolean) as string[];

  async function onSubmit(values: SourceTestFormValues) {
    if (!canTest || testMutation.isPending) return;
    setStatus({ kind: 'idle' });
    try {
      const result = await testMutation.mutateAsync({
        apiKey: values.apiKey || undefined,
        locale: i18n.language || 'en-US',
      });
      form.reset({ apiKey: '' });
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
      form.reset({ apiKey: '' });
      setStatus({
        kind: 'failure',
        messageKey: 'sources.test.offline',
        code: 'NETWORK',
      });
    }
  }

  return (
    <article className="ml-surface p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold tracking-tight text-[var(--ml-text)]">
            {source.name}
          </h2>
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

      <form className="mt-4 space-y-3" onSubmit={form.handleSubmit(onSubmit)}>
        {canTest && source.requiresCredential ? (
          <label className="block space-y-1.5">
            <span className="text-sm ml-text-muted">
              {t('sources.test.apiKeyLabel')}
            </span>
            <Input
              type="password"
              autoComplete="off"
              placeholder={t('sources.test.apiKeyPlaceholder')}
              {...form.register('apiKey')}
            />
          </label>
        ) : null}

        <div className="flex flex-wrap gap-2">
          <Button type="button" size="sm" disabled>
            {source.requiresOAuth || source.requiresCredential
              ? t('sources.actions.connect')
              : t('sources.actions.test')}
          </Button>
          <Button
            type="submit"
            size="sm"
            variant="outline"
            disabled={!canTest || testMutation.isPending}
          >
            {testMutation.isPending
              ? t('sources.test.running')
              : t('sources.actions.test')}
          </Button>
          <Button type="button" size="sm" variant="ghost" disabled>
            {t('sources.actions.disconnect')}
          </Button>
        </div>
      </form>

      {status.kind === 'success' ? (
        <p className="mt-3 text-sm text-emerald-400" role="status">
          {t('sources.test.success', {
            state: status.result.health?.state ?? 'healthy',
          })}
        </p>
      ) : null}
      {status.kind === 'failure' ? (
        <p className="mt-3 text-sm text-red-400" role="alert">
          {t(status.messageKey, { code: status.code ?? 'ERROR' })}
        </p>
      ) : null}
    </article>
  );
}
