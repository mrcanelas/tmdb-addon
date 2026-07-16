import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button, Chip, Input } from '@metalayer/shared-ui';
import type { PublicSource, SourceTestResult } from '@/lib/api';
import { useTestSourceMutation } from '@/api/hooks/use-sources';
import {
  sourceTestFormSchema,
  type SourceTestFormValues,
} from '@/api/schemas/source-test';

interface SourceCardProps {
  source: PublicSource;
}

type TestStatus =
  | { kind: 'idle' }
  | { kind: 'success'; result: SourceTestResult }
  | { kind: 'failure'; result?: SourceTestResult; messageKey: string; code?: string };

function connectionChipColor(
  state: PublicSource['connectionState'],
): 'default' | 'success' | 'warning' | 'danger' | 'accent' {
  switch (state) {
    case 'connected':
      return 'success';
    case 'degraded':
    case 'expired':
      return 'warning';
    case 'invalid':
      return 'danger';
    case 'coming_soon':
      return 'accent';
    default:
      return 'default';
  }
}

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

  function healthLabel(state: string | undefined): string {
    const raw = state ?? 'healthy';
    const key = `sources.health.${raw}`;
    const translated = t(key);
    return translated === key ? raw : translated;
  }

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
    <article className="ml-surface flex h-full flex-col p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold tracking-tight text-[var(--foreground)]">
            {source.name}
          </h2>
          <div className="flex flex-wrap gap-1.5">
            {source.categories.map((category) => (
              <Chip key={category} size="sm" variant="soft" color="default">
                {t(`sources.category.${category}`)}
              </Chip>
            ))}
            <Chip size="sm" variant="soft" color="default">
              {source.adapterAvailable
                ? t('sources.adapter.available')
                : t('sources.adapter.unavailable')}
            </Chip>
          </div>
        </div>
        <Chip
          size="sm"
          variant="soft"
          color={connectionChipColor(source.connectionState)}
        >
          {t(`sources.state.${source.connectionState}`)}
        </Chip>
      </div>

      {capabilityLabels.length > 0 ? (
        <ul className="mt-3 flex flex-wrap gap-1.5">
          {capabilityLabels.map((label) => (
            <li key={label}>
              <Chip size="sm" variant="soft" color="default">
                {label}
              </Chip>
            </li>
          ))}
        </ul>
      ) : null}

      <p className="mt-3 text-xs ml-text-muted">{t('sources.unavailableHint')}</p>

      <form className="mt-auto space-y-3 pt-4" onSubmit={form.handleSubmit(onSubmit)}>
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
          <Button type="button" size="sm" isDisabled>
            {source.requiresOAuth || source.requiresCredential
              ? t('sources.actions.connect')
              : t('sources.actions.test')}
          </Button>
          <Button
            type="submit"
            size="sm"
            variant="outline"
            isDisabled={!canTest || testMutation.isPending}
          >
            {testMutation.isPending
              ? t('sources.test.running')
              : t('sources.actions.test')}
          </Button>
          <Button type="button" size="sm" variant="ghost" isDisabled>
            {t('sources.actions.disconnect')}
          </Button>
        </div>
      </form>

      {status.kind === 'success' ? (
        <p className="mt-3 text-sm text-[var(--success)]" role="status">
          {t('sources.test.success', {
            state: healthLabel(status.result.health?.state),
          })}
        </p>
      ) : null}
      {status.kind === 'failure' ? (
        <p className="mt-3 text-sm text-[var(--danger)]" role="alert">
          {t(status.messageKey, { code: status.code ?? 'ERROR' })}
        </p>
      ) : null}
    </article>
  );
}
