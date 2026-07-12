import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  fetchTrackingStatus,
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
        fixtures: [
          {
            provider: 'trakt',
            mediaType: 'movie',
            status: 'completed',
            externalIds: { imdb: 'tt0137523' },
          },
        ],
      });
    },
  });
}
