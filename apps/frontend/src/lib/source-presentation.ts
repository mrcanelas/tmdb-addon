/**
 * Presentation metadata for Sources catalog cards.
 * Brand names stay in the API; short blurbs live in i18n (`sources.providers.<id>.description`).
 * Icons use stable public URLs — never the fragile Trakt CDN asset from the legacy configure UI.
 */
export type SourcePresentation = {
  /** Remote logo URL; cards fall back to a letter avatar on load error. */
  iconUrl?: string;
};

/**
 * Prefer simpleicons (CC0) or known-stable brand assets.
 * Color suffixes keep logos readable on dark MetaLayer surfaces.
 */
export const SOURCE_PRESENTATION: Record<string, SourcePresentation> = {
  tmdb: {
    iconUrl:'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQ88uMXiNZHz920tM0CFNz4O2VYPStos1yYY08IBix5MeJ7eOBAo57Jj8Q&s=10',
  },
  tvdb: {
    iconUrl: 'https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/svg/tvdb.svg',
  },
  fanart: {
    // Fanart has no simpleicons entry; site favicon is stable enough for catalog cards.
    iconUrl: 'https://fanart.tv/favicon.ico',
  },
  rpdb: {
    iconUrl: 'https://github.com/RatingPosterDB.png',
  },
  trakt: {
    iconUrl: 'https://cdn.simpleicons.org/trakt/ed1c24',
  },
  simkl: {
    iconUrl: 'https://cdn.simpleicons.org/simkl/0C9CFE',
  },
  mdblist: {
    iconUrl: 'https://cdn.simpleicons.org/mdblist/4285F4',
  },
  imdb: {
    iconUrl: 'https://www.branch.io/wp-content/uploads/2024/06/Template_CS_featureimage-7.png',
  },
  anilist: {
    iconUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/61/AniList_logo.svg/1280px-AniList_logo.svg.png',
  },
  mal: {
    iconUrl: 'https://upload.wikimedia.org/wikipedia/commons/7/7a/MyAnimeList_Logo.png',
  },
  kitsu: {
    iconUrl: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTaGS9CRIN5uV_bGgE1Y0j_MmlF63q0me6ZzgE25goeX764_UnHhO4nfIw&s=10',
  },
  gemini: {
    iconUrl: 'https://cdn.simpleicons.org/googlegemini/8E75B2',
  },
};

export function sourceIconUrl(providerId: string): string | undefined {
  return SOURCE_PRESENTATION[providerId]?.iconUrl;
}

export function sourceDescriptionKey(providerId: string): string {
  return `sources.providers.${providerId}.description`;
}
