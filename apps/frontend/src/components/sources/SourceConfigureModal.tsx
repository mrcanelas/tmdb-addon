import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button, Input, Modal } from '@metalayer/shared-ui';
import type { PublicSource, SourceTestResult } from '@/lib/api';
import { useTestSourceMutation } from '@/api/hooks/use-sources';
import {
  sourceTestFormSchema,
  type SourceTestFormValues,
} from '@/api/schemas/source-test';
import { sourceDescriptionKey } from '@/lib/source-presentation';
import { SourceProviderIcon } from '@/components/sources/SourceProviderIcon';

type TestStatus =
  | { kind: 'idle' }
  | { kind: 'success'; result: SourceTestResult }
  | { kind: 'failure'; messageKey: string; code?: string };

export function SourceConfigureModal({
  source,
  isOpen,
  onOpenChange,
}: {
  source: PublicSource | null;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { t, i18n } = useTranslation('sources');
  const [status, setStatus] = useState<TestStatus>({ kind: 'idle' });
  const testMutation = useTestSourceMutation(source?.id ?? '');

  const form = useForm<SourceTestFormValues>({
    resolver: zodResolver(sourceTestFormSchema),
    defaultValues: { apiKey: '' },
  });

  if (!source) return null;

  const comingSoon = source.connectionState === 'coming_soon';
  const canTest = source.adapterAvailable && !comingSoon;
  const description = t(sourceDescriptionKey(source.id), { defaultValue: '' });

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
    <Modal.Backdrop
      isOpen={isOpen}
      onOpenChange={(open) => {
        if (!open) setStatus({ kind: 'idle' });
        onOpenChange(open);
      }}
      variant="blur"
      isDismissable
    >
      <Modal.Container size="md" placement="center">
        <Modal.Dialog>
          <Modal.CloseTrigger />
          <Modal.Header>
            <div className="flex items-start gap-3 pe-8">
              <SourceProviderIcon
                providerId={source.id}
                name={source.name}
                size="md"
              />
              <div className="min-w-0 space-y-1">
                <Modal.Heading>
                  {t('sources.configure.title', { name: source.name })}
                </Modal.Heading>
                {description ? (
                  <p className="text-sm ml-text-muted">{description}</p>
                ) : null}
              </div>
            </div>
          </Modal.Header>
          <Modal.Body className="gap-3">
            <p className="text-sm ml-text-muted">
              {t('sources.unavailableHint')}
            </p>
            <form
              id={`source-configure-${source.id}`}
              className="space-y-3"
              onSubmit={form.handleSubmit(onSubmit)}
            >
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
            </form>
            {status.kind === 'success' ? (
              <p className="text-sm text-[var(--success)]" role="status">
                {t('sources.test.success', {
                  state: healthLabel(status.result.health?.state),
                })}
              </p>
            ) : null}
            {status.kind === 'failure' ? (
              <p className="text-sm text-[var(--danger)]" role="alert">
                {t(status.messageKey, { code: status.code ?? 'ERROR' })}
              </p>
            ) : null}
          </Modal.Body>
          <Modal.Footer>
            <Button
              type="button"
              variant="outline"
              onPress={() => onOpenChange(false)}
            >
              {t('sources.configure.close')}
            </Button>
            <Button
              type="submit"
              form={`source-configure-${source.id}`}
              isDisabled={!canTest || testMutation.isPending}
            >
              {testMutation.isPending
                ? t('sources.test.running')
                : t('sources.actions.test')}
            </Button>
          </Modal.Footer>
        </Modal.Dialog>
      </Modal.Container>
    </Modal.Backdrop>
  );
}
