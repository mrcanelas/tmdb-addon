import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  completeTraktOAuth,
  disconnectTrakt,
  fetchTrackingStatus,
  fetchTraktAuthUrl,
  previewHideWatched,
} from '@/lib/api';
import { queryKeys } from '@/api/query-keys';
import { useStudioSessionQuery } from '@/api/hooks/use-studio-session';

export function useTrackingStatusQuery() {
  const sessionQuery = useStudioSessionQuery();
  const session = sessionQuery.data;

  return useQuery({
    queryKey: queryKeys.tracking.status(session?.configId ?? 'pending'),
    queryFn: () =>
      fetchTrackingStatus(session!.configId, session!.editCredential),
    enabled: Boolean(session),
  });
}

export function useHideWatchedPreviewMutation() {
  const sessionQuery = useStudioSessionQuery();

  return useMutation({
    mutationFn: async () => {
      const session = sessionQuery.data ?? (await sessionQuery.refetch()).data;
      if (!session) throw new Error('Studio session missing');
      return previewHideWatched(session.configId, session.editCredential, {
        hideWatched: true,
        items: [
          { id: 'tt0137523', title: 'Fight Club' },
          { id: 'tt0111161', title: 'Shawshank' },
        ],
        // Prefer live vault sync; fixtures only when disconnected.
        fixtures: undefined,
        provider: 'trakt',
      });
    },
  });
}

export function useTraktConnectMutation() {
  const sessionQuery = useStudioSessionQuery();

  return useMutation({
    mutationFn: async () => {
      const session = sessionQuery.data ?? (await sessionQuery.refetch()).data;
      if (!session) throw new Error('Studio session missing');
      const redirectUri = `${window.location.origin}/configure/oauth/trakt/callback`;
      const { authUrl } = await fetchTraktAuthUrl(
        session.configId,
        session.editCredential,
        redirectUri,
      );
      window.open(authUrl, 'metalayer-trakt-oauth', 'width=600,height=720');
      return { authUrl };
    },
  });
}

export function useTraktDisconnectMutation() {
  const sessionQuery = useStudioSessionQuery();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const session = sessionQuery.data ?? (await sessionQuery.refetch()).data;
      if (!session) throw new Error('Studio session missing');
      return disconnectTrakt(session.configId, session.editCredential);
    },
    onSuccess: async () => {
      const configId = sessionQuery.data?.configId;
      if (configId) {
        await queryClient.invalidateQueries({
          queryKey: queryKeys.tracking.status(configId),
        });
      }
    },
  });
}

export function useTraktCallbackMutation() {
  const sessionQuery = useStudioSessionQuery();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: { code: string; redirectUri: string }) => {
      const session = sessionQuery.data ?? (await sessionQuery.refetch()).data;
      if (!session) throw new Error('Studio session missing');
      return completeTraktOAuth(
        session.configId,
        session.editCredential,
        input,
      );
    },
    onSuccess: async () => {
      const configId = sessionQuery.data?.configId;
      if (configId) {
        await queryClient.invalidateQueries({
          queryKey: queryKeys.tracking.status(configId),
        });
      }
    },
  });
}
