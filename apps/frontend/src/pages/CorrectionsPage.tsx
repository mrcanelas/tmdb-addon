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
import { PageActions } from '@/components/metalayer/PageHeader';
import { usePageHeader } from '@/contexts/page-title';
import { SectionCard } from '@/components/metalayer/SectionCard';
import { LoadingState } from '@/components/metalayer/LoadingState';
import { ErrorState } from '@/components/metalayer/ErrorState';
import { EmptyState } from '@/components/metalayer/EmptyState';

type Feedback =
  | { kind: 'ok'; messageKey: string }
  | { kind: 'error'; messageKey: string }
  | null;

export function CorrectionsPage() {
  const { t } = useTranslation(['corrections', 'common']);
  usePageHeader(t('corrections.title'), t('corrections.intro'));
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

  const feedback: Feedback = createMutation.isError
    ? { kind: 'error', messageKey: 'corrections.createError' }
    : deleteMutation.isError
      ? { kind: 'error', messageKey: 'corrections.rollbackError' }
      : previewMutation.isError
        ? { kind: 'error', messageKey: 'corrections.previewError' }
        : createMutation.isSuccess
          ? { kind: 'ok', messageKey: 'corrections.createOk' }
          : deleteMutation.isSuccess
            ? { kind: 'ok', messageKey: 'corrections.rollbackOk' }
            : previewMutation.isSuccess
              ? { kind: 'ok', messageKey: 'corrections.previewOk' }
              : null;

  async function onCreate() {
    createMutation.reset();
    deleteMutation.reset();
    previewMutation.reset();
    try {
      await createMutation.mutateAsync();
    } catch {
      // Feedback derived from mutation state.
    }
  }

  async function onPreview() {
    createMutation.reset();
    deleteMutation.reset();
    previewMutation.reset();
    try {
      await previewMutation.mutateAsync();
    } catch {
      // Feedback derived from mutation state.
    }
  }

  async function onRollback(id: string) {
    createMutation.reset();
    deleteMutation.reset();
    previewMutation.reset();
    try {
      await deleteMutation.mutateAsync(id);
    } catch {
      // Feedback derived from mutation state.
    }
  }

  return (
    <section className="space-y-6">
      <PageActions>
        <Button
          type="button"
          onPress={() => {
            void onCreate();
          }}
          isDisabled={bootstrapping || createMutation.isPending}
        >
          {t('corrections.addLocal')}
        </Button>
        <Button
          type="button"
          variant="secondary"
          onPress={() => {
            void onPreview();
          }}
          isDisabled={bootstrapping || previewMutation.isPending}
        >
          {t('corrections.preview')}
        </Button>
      </PageActions>

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

      {feedback?.kind === 'ok' ? (
        <p className="text-sm text-[var(--success)]" role="status">
          {t(feedback.messageKey)}
        </p>
      ) : null}
      {feedback?.kind === 'error' ? (
        <p className="text-sm text-[var(--danger)]" role="alert">
          {t(feedback.messageKey)}
        </p>
      ) : null}

      {previewMutation.data ? (
        <SectionCard>
          <p className="text-sm text-[var(--foreground)]" role="status">
            {t('corrections.previewResultLine', {
              title: String(previewMutation.data.applied.title ?? ''),
              count: previewMutation.data.overlays.length,
            })}
          </p>
        </SectionCard>
      ) : null}

      {!bootstrapping && !loadError ? (
        <>
          <CorrectionList
            title={t('corrections.local')}
            items={local}
            emptyLabel={t('corrections.empty')}
            metaLine={(item) =>
              t('corrections.metaLine', {
                status: item.status,
                scope: item.scope,
              })
            }
            rollbackLabel={t('corrections.rollback')}
            onRollback={(id) => {
              void onRollback(id);
            }}
            rollbackPending={deleteMutation.isPending}
          />
          <CorrectionList
            title={t('corrections.resolved')}
            items={resolved}
            emptyLabel={t('corrections.empty')}
            metaLine={(item) =>
              t('corrections.metaLine', {
                status: item.status,
                scope: item.scope,
              })
            }
          />
          <CorrectionList
            title={t('corrections.community')}
            items={community}
            emptyLabel={t('corrections.empty')}
            metaLine={(item) =>
              t('corrections.metaLine', {
                status: item.status,
                scope: item.scope,
              })
            }
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
  metaLine: (item: CorrectionItem) => string;
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
              className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border)] pb-3 last:border-b-0 last:pb-0"
            >
              <div className="space-y-1">
                <p className="font-medium text-[var(--foreground)]">
                  {item.type} · {item.target.provider}:{item.target.id}
                </p>
                <p className="text-sm ml-text-muted">{item.reason}</p>
                <p className="text-xs ml-text-muted">{props.metaLine(item)}</p>
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
