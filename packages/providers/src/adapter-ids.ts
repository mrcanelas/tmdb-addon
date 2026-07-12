/** Adapter ids that have a concrete implementation (browser-safe, no Node deps). */
export function listAdapterProviderIds(): string[] {
  return ['tmdb', 'fanart', 'rpdb', 'imdb'];
}
