import lzStringModule from 'lz-string';

type LzStringApi = {
  compressToEncodedURIComponent(input: string): string;
  decompressFromEncodedURIComponent(input: string): string | null;
};

/**
 * lz-string is CommonJS-only. Node ESM (tsx/runtime) rejects named imports, so
 * normalize default / namespace interop here once.
 */
const candidate = lzStringModule as unknown as LzStringApi & { default?: LzStringApi };
const lzString: LzStringApi =
  typeof candidate.decompressFromEncodedURIComponent === 'function'
    ? candidate
    : (candidate.default as LzStringApi);

export const compressToEncodedURIComponent =
  lzString.compressToEncodedURIComponent.bind(lzString);
export const decompressFromEncodedURIComponent =
  lzString.decompressFromEncodedURIComponent.bind(lzString);
