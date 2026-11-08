import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/api/query-keys';
import { fetchGithubReleases } from '@/lib/whats-new';

export function useGithubReleasesQuery() {
  return useQuery({
    queryKey: queryKeys.githubReleases.list(),
    queryFn: () => fetchGithubReleases(12),
    staleTime: 60 * 60 * 1000,
    gcTime: 6 * 60 * 60 * 1000,
    retry: 1,
    refetchOnWindowFocus: false,
  });
}
