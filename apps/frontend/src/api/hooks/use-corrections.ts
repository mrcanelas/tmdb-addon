import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createLocalCorrection,
  deleteLocalCorrection,
  fetchCorrections,
  previewCorrections,
} from '@/lib/api';
import { queryKeys } from '@/api/query-keys';
import { useStudioSessionQuery } from '@/api/hooks/use-studio-session';
import { i18n } from '@/lib/i18n';

export function useCorrectionsQuery() {
  const sessionQuery = useStudioSessionQuery();
  const session = sessionQuery.data;

  return useQuery({
    queryKey: queryKeys.corrections.list(session?.configId ?? 'pending'),
    queryFn: () => fetchCorrections(session!.configId, session!.editCredential),
    enabled: Boolean(session),
  });
}

export function useCreateLocalCorrectionMutation() {
  const queryClient = useQueryClient();
  const sessionQuery = useStudioSessionQuery();

  return useMutation({
    mutationFn: async () => {
      const session = sessionQuery.data ?? (await sessionQuery.refetch()).data;
      if (!session) throw new Error('Studio session missing');
      return createLocalCorrection(session.configId, session.editCredential, {
        target: { provider: 'imdb', id: 'tt0137523', entityKind: 'movie' },
        type: 'title_correction',
        payload: {
          title: i18n.t('corrections.sample.localTitle', { ns: 'corrections' }),
        },
        reason: i18n.t('corrections.sample.reason', { ns: 'corrections' }),
        sources: [
          {
            kind: 'manual',
            label: i18n.t('corrections.sample.sourceLabel', {
              ns: 'corrections',
            }),
          },
        ],
      });
    },
    onSuccess: async () => {
      const configId = sessionQuery.data?.configId;
      if (configId) {
        await queryClient.invalidateQueries({
          queryKey: queryKeys.corrections.list(configId),
        });
      }
    },
  });
}

export function useDeleteLocalCorrectionMutation() {
  const queryClient = useQueryClient();
  const sessionQuery = useStudioSessionQuery();

  return useMutation({
    mutationFn: async (id: string) => {
      const session = sessionQuery.data ?? (await sessionQuery.refetch()).data;
      if (!session) throw new Error('Studio session missing');
      return deleteLocalCorrection(session.configId, session.editCredential, id);
    },
    onSuccess: async () => {
      const configId = sessionQuery.data?.configId;
      if (configId) {
        await queryClient.invalidateQueries({
          queryKey: queryKeys.corrections.list(configId),
        });
      }
    },
  });
}

export function usePreviewCorrectionsMutation() {
  const sessionQuery = useStudioSessionQuery();

  return useMutation({
    mutationFn: async () => {
      const session = sessionQuery.data ?? (await sessionQuery.refetch()).data;
      if (!session) throw new Error('Studio session missing');
      return previewCorrections(session.configId, session.editCredential, {
        provider: 'imdb',
        id: 'tt0137523',
        base: {
          title: i18n.t('corrections.sample.providerTitle', {
            ns: 'corrections',
          }),
        },
      });
    },
  });
}
