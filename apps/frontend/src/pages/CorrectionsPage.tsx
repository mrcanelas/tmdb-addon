import { useTranslation } from 'react-i18next';
import { Button } from '@metalayer/shared-ui';
import type { CorrectionItem } from '@/lib/api';
import {
  useCorrectionsQuery,
  useCreateLocalCorrectionMutation,
  useDeleteLocalCorrectionMutation,
  usePreviewCorrectionsMutation,
} from '@/api/hooks/use-corrections';
import { useStudioSessionQuery } from '@/api/hooks/use-studio-session';
import { PageHeader } from '@/components/metalayer/PageHeader';
import { SectionCard } from '@/components/metalayer/SectionCard';
import { LoadingState } from '@/components/metalayer/LoadingState';
import { ErrorState } from '@/components/metalayer/ErrorState';
import { EmptyState } from '@/components/metalayer/EmptyState';

export function CorrectionsPage() {
  const { t } = useTranslation(['corrections', 'common']);
  const sessionQuery = useStudioSessionQuery();
  const correctionsQuery = useCorrectionsQuery();
  const createMutation = useCreateLocalCorrectionMutation();
  const deleteMutation = useDeleteLocalCorrectionMutation();
  const previewMutation = usePreviewCorrectionsMutation();

  const bootstrapping = sessionQuery.isLoading || correctionsQuery.isLoading;
  const loadError = sessionQuery.isError || correctionsQuery.isError;
  const local = correctionsQuery.data?.local ?? [];
  const community = correctionsQuery.data?.community ?? [];
  const resolved = correctionsQuery.data?.resolved ?? [];

  return (
    <section className="space-y-6">
      <PageHeader
        title={t('corrections.title')}
        description={t('corrections.intro')}
        actions={
          <>
            <Button
              type="button"
              onPress={() => {
                void createMutation.mutateAsync();
              }}
              isDisabled={bootstrapping || createMutation.isPending}
            >
              {t('corrections.addLocal')}
            </Button>
            <Button
              type="button"
              variant="secondary"
              onPress={() => {
                void previewMutation.mutateAsync();
              }}
              isDisabled={bootstrapping || previewMutation.isPending}
            >
              {t('corrections.preview')}
            </Button>
          </>
        }
      />

      {bootstrapping ? (
        <LoadingState label={t('corrections.bootstrapping')} />
      ) : null}

      {loadError ? (
        <ErrorState
          message={t('corrections.loadError')}
          retryLabel={t('common:state.retry')}
          onRetry={() => {
            void sessionQuery.refetch();
            void correctionsQuery.refetch();
          }}
        />
      ) : null}

      {previewMutation.data ? (
        <SectionCard>
          <p className="text-sm text-[var(--ml-text)]">
            {t('corrections.previewResult', {
              title: String(previewMutation.data.applied.title ?? ''),
            })}{' '}
            · {t('corrections.overlays')}: {previewMutation.data.overlays.length}
          </p>
        </SectionCard>
      ) : null}

      {!bootstrapping && !loadError ? (
        <>
          <CorrectionList
            title={t('corrections.local')}
            items={local}
            emptyLabel={t('corrections.empty')}
            statusLabel={t('corrections.status')}
            scopeLabel={t('corrections.scope')}
            rollbackLabel={t('corrections.rollback')}
            onRollback={(id) => {
              void deleteMutation.mutateAsync(id);
            }}
            rollbackPending={deleteMutation.isPending}
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
        </>
      ) : null}
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
  rollbackPending?: boolean;
}) {
  return (
    <SectionCard title={props.title}>
      {props.items.length === 0 ? (
        <EmptyState title={props.emptyLabel} />
      ) : (
        <ul className="space-y-3">
          {props.items.map((item) => (
            <li
              key={item.id}
              className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--ml-border)] pb-3 last:border-b-0 last:pb-0"
            >
              <div className="space-y-1">
                <p className="font-medium text-[var(--ml-text)]">
                  {item.type} · {item.target.provider}:{item.target.id}
                </p>
                <p className="text-sm ml-text-muted">{item.reason}</p>
                <p className="text-xs ml-text-muted">
                  {props.statusLabel}: {item.status} · {props.scopeLabel}:{' '}
                  {item.scope}
                </p>
              </div>
              {props.onRollback && item.scope === 'local' ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  isDisabled={props.rollbackPending}
                  onPress={() => props.onRollback?.(item.id)}
                >
                  {props.rollbackLabel}
                </Button>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </SectionCard>
  );
}
