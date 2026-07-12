/** Central query-key factory for MetaLayer configure UI. */
export const queryKeys = {
  sources: {
    all: ['sources'] as const,
    list: () => [...queryKeys.sources.all, 'list'] as const,
  },
  tracking: {
    status: (configId: string) => ['tracking', 'status', configId] as const,
  },
  corrections: {
    list: (configId: string) => ['corrections', 'list', configId] as const,
  },
};
