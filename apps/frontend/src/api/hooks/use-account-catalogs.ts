import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  fetchAccountCatalogSources,
  importAccountCatalogs,
  type AccountCatalogImportSelection,
} from '@/lib/api';
import { queryKeys } from '@/api/query-keys';

export function accountCatalogQueryKeys(configId: string) {
  return {
    sources: ['account-catalogs', 'sources', configId] as const,
  };
}

export function useAccountCatalogSourcesQuery(
  configId: string | undefined,
  editCredential: string | undefined,
  enabled = true,
) {
  return useQuery({
    queryKey: accountCatalogQueryKeys(configId ?? '').sources,
    enabled: enabled && Boolean(configId && editCredential),
    queryFn: () => fetchAccountCatalogSources(configId!, editCredential!),
    staleTime: 30_000,
  });
}

export function useImportAccountCatalogsMutation(
  configId: string,
  editCredential: string,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (selections: AccountCatalogImportSelection[]) =>
      importAccountCatalogs(configId, editCredential, selections),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.sources.all });
    },
  });
}
