import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  completeTrackingOAuth,
  disconnectTracking,
  fetchTrackingAuthUrl,
  fetchTrackingStatus,
  previewHideWatched,
  type TrackingOAuthProvider,
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

export function useHideWatchedPreviewMutation(
  provider: TrackingOAuthProvider = 'trakt',
) {
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
        fixtures: undefined,
        provider,
      });
    },
  });
}

export function useTrackingConnectMutation(provider: TrackingOAuthProvider) {
  const sessionQuery = useStudioSessionQuery();

  return useMutation({
    mutationFn: async () => {
      const session = sessionQuery.data ?? (await sessionQuery.refetch()).data;
      if (!session) throw new Error('Studio session missing');
      const redirectUri = `${window.location.origin}/configure/oauth/${provider}/callback`;
      const { authUrl } = await fetchTrackingAuthUrl(
        session.configId,
        session.editCredential,
        provider,
        redirectUri,
      );
      window.open(
        authUrl,
        `metalayer-${provider}-oauth`,
        'width=600,height=720',
      );
      return { authUrl };
    },
  });
}

export function useTrackingDisconnectMutation(provider: TrackingOAuthProvider) {
  const sessionQuery = useStudioSessionQuery();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const session = sessionQuery.data ?? (await sessionQuery.refetch()).data;
      if (!session) throw new Error('Studio session missing');
      return disconnectTracking(
        session.configId,
        session.editCredential,
        provider,
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

export function useTrackingCallbackMutation(provider: TrackingOAuthProvider) {
  const sessionQuery = useStudioSessionQuery();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: { code: string; redirectUri: string }) => {
      const session = sessionQuery.data ?? (await sessionQuery.refetch()).data;
      if (!session) throw new Error('Studio session missing');
      return completeTrackingOAuth(
        session.configId,
        session.editCredential,
        provider,
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

/** @deprecated Prefer useTrackingConnectMutation('trakt') */
export function useTraktConnectMutation() {
  return useTrackingConnectMutation('trakt');
}

/** @deprecated Prefer useTrackingDisconnectMutation('trakt') */
export function useTraktDisconnectMutation() {
  return useTrackingDisconnectMutation('trakt');
}

/** @deprecated Prefer useTrackingCallbackMutation('trakt') */
export function useTraktCallbackMutation() {
  return useTrackingCallbackMutation('trakt');
}
