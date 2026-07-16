import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  connectPublicMetaDB,
  disconnectPublicMetaDB,
  fetchPublicMetaDBLists,
  fetchPublicMetaDBPicks,
  fetchPublicMetaDBStatus,
  importPublicMetaDBCatalogs,
  type PublicMetaDBImportSelection,
} from '@/lib/api';
import { queryKeys } from '@/api/query-keys';

export function publicMetaDBQueryKeys(configId: string) {
  return {
    status: ['publicmetadb', 'status', configId] as const,
    lists: ['publicmetadb', 'lists', configId] as const,
    picks: ['publicmetadb', 'picks', configId] as const,
  };
}

export function usePublicMetaDBStatusQuery(
  configId: string | undefined,
  editCredential: string | undefined,
) {
  return useQuery({
    queryKey: publicMetaDBQueryKeys(configId ?? '').status,
    enabled: Boolean(configId && editCredential),
    queryFn: () => fetchPublicMetaDBStatus(configId!, editCredential!),
  });
}

export function useConnectPublicMetaDBMutation(
  configId: string,
  editCredential: string,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (apiKey: string) =>
      connectPublicMetaDB(configId, editCredential, apiKey),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: publicMetaDBQueryKeys(configId).status,
      });
      void queryClient.invalidateQueries({ queryKey: queryKeys.sources.all });
    },
  });
}

export function useDisconnectPublicMetaDBMutation(
  configId: string,
  editCredential: string,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => disconnectPublicMetaDB(configId, editCredential),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: publicMetaDBQueryKeys(configId).status,
      });
      void queryClient.invalidateQueries({ queryKey: queryKeys.sources.all });
    },
  });
}

export function useLoadPublicMetaDBListsMutation(
  configId: string,
  editCredential: string,
) {
  return useMutation({
    mutationFn: (apiKey?: string) =>
      fetchPublicMetaDBLists(configId, editCredential, apiKey),
  });
}

export function useLoadPublicMetaDBPicksMutation(
  configId: string,
  editCredential: string,
) {
  return useMutation({
    mutationFn: (apiKey?: string) =>
      fetchPublicMetaDBPicks(configId, editCredential, apiKey),
  });
}

export function useImportPublicMetaDBCatalogsMutation(
  configId: string,
  editCredential: string,
) {
  return useMutation({
    mutationFn: (input: {
      apiKey?: string;
      selections: PublicMetaDBImportSelection[];
    }) => importPublicMetaDBCatalogs(configId, editCredential, input),
  });
}
