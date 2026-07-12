import { useQuery } from '@tanstack/react-query';
import { ensureStudioSession } from '@/lib/api';

export const studioSessionQueryKey = ['studio-session'] as const;

/** Ensures a draft configure session exists (configId + edit credential). */
export function useStudioSessionQuery() {
  return useQuery({
    queryKey: studioSessionQueryKey,
    queryFn: ensureStudioSession,
    staleTime: Infinity,
    retry: 1,
  });
}
