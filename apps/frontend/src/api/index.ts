export { queryKeys } from '@/api/query-keys';
export { useSourcesQuery, useTestSourceMutation } from '@/api/hooks/use-sources';

/** Service functions remain in `@/lib/api` until module splits land. */
export * from '@/lib/api';
