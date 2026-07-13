import { useQuery, type QueryClient } from '@tanstack/react-query';
import {
  ensureStudioSession,
  readCatalogSession,
  type CatalogSession,
} from '@/lib/api';

export const studioSessionQueryKey = ['studio-session'] as const;

/** Keeps TanStack Query in sync when sessionStorage is rewritten outside ensureStudioSession. */
export function syncStudioSessionQuery(
  queryClient: QueryClient,
  session?: CatalogSession | null,
): void {
  const next = session === undefined ? readCatalogSession() : session;
  if (next) {
    queryClient.setQueryData(studioSessionQueryKey, next);
    return;
  }
  queryClient.removeQueries({ queryKey: studioSessionQueryKey });
}

/** Ensures a draft configure session exists (configId + edit credential). */
export function useStudioSessionQuery() {
  return useQuery({
    queryKey: studioSessionQueryKey,
    queryFn: ensureStudioSession,
    staleTime: Infinity,
    retry: 1,
  });
}
