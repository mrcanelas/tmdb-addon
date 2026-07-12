import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchSources, testSource } from '@/lib/api';
import type { SourceTestResult } from '@/lib/api';
import { queryKeys } from '@/api/query-keys';

export function useSourcesQuery() {
  return useQuery({
    queryKey: queryKeys.sources.list(),
    queryFn: fetchSources,
  });
}

export function useTestSourceMutation(providerId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: { apiKey?: string; locale?: string }) =>
      testSource(providerId, input),
    onSuccess: (result: SourceTestResult) => {
      if (result.ok) {
        void queryClient.invalidateQueries({ queryKey: queryKeys.sources.all });
      }
    },
  });
}
