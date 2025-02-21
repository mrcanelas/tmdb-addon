export interface ExtraOption {
  name: string;
  options?: string[];
  isRequired?: boolean;
}

export interface Catalog {
  id: string;
  name: string;
  type: "movie" | "series";
  extraRequired?: boolean;
}

export const baseCatalogs: Catalog[] = [
  { id: "tmdb.top", name: "Popular", type: "movie" },
  { id: "tmdb.top", name: "Popular", type: "series" },
  { id: "tmdb.year", name: "Year", type: "movie" },
  { id: "tmdb.year", name: "Year", type: "series" },
  { id: "tmdb.language", name: "Language", type: "movie" },
  { id: "tmdb.language", name: "Language", type: "series" },
  { id: "tmdb.trending", name: "Trending", type: "movie" },
  { id: "tmdb.trending", name: "Trending", type: "series" },
];

export const authCatalogs: Catalog[] = [
  { id: "tmdb.favorites", name: "Favorites", type: "movie" },
  { id: "tmdb.favorites", name: "Favorites", type: "series" },
  { id: "tmdb.watchlist", name: "Watchlist", type: "movie" },
  { id: "tmdb.watchlist", name: "Watchlist", type: "series" },
];

export const mdblistCatalogs: Catalog[] = [
  { id: "mdblist.lists", name: "MDBList Lists", type: "movie" },
  { id: "mdblist.lists", name: "MDBList Lists", type: "series" },
  { id: "mdblist.recommended", name: "MDBList Recommended", type: "movie" },
  { id: "mdblist.recommended", name: "MDBList Recommended", type: "series" },
  { id: "mdblist.watchlist", name: "MDBList Watchlist", type: "movie" },
  { id: "mdblist.watchlist", name: "MDBList Watchlist", type: "series" },
];

export const streamingCatalogs: Record<string, Catalog[]> = {
  nfx: [
    { id: "streaming.nfx", name: "Netflix", type: "movie" },
    { id: "streaming.nfx", name: "Netflix", type: "series" }
  ],
  nfk: [
    { id: "streaming.nfk", name: "Netflix Kids", type: "movie" },
    { id: "streaming.nfk", name: "Netflix Kids", type: "series" }
  ],
  hbm: [
    { id: "streaming.hbm", name: "HBO Max", type: "movie" },
    { id: "streaming.hbm", name: "HBO Max", type: "series" }
  ],
  dnp: [
    { id: "streaming.dnp", name: "Disney+", type: "movie" },
    { id: "streaming.dnp", name: "Disney+", type: "series" }
  ],
  amp: [
    { id: "streaming.amp", name: "Prime Video", type: "movie" },
    { id: "streaming.amp", name: "Prime Video", type: "series" }
  ],
  atp: [
    { id: "streaming.atp", name: "Apple TV+", type: "movie" },
    { id: "streaming.atp", name: "Apple TV+", type: "series" }
  ],
  pmp: [
    { id: "streaming.pmp", name: "Paramount+", type: "movie" },
    { id: "streaming.pmp", name: "Paramount+", type: "series" }
  ],
  pcp: [
    { id: "streaming.pcp", name: "Peacock Premium", type: "movie" },
    { id: "streaming.pcp", name: "Peacock Premium", type: "series" }
  ],
  hlu: [
    { id: "streaming.hlu", name: "Hulu", type: "movie" },
    { id: "streaming.hlu", name: "Hulu", type: "series" }
  ],
  cts: [
    { id: "streaming.cts", name: "Curiosity Stream", type: "movie" },
    { id: "streaming.cts", name: "Curiosity Stream", type: "series" }
  ],
  mgl: [
    { id: "streaming.mgl", name: "MagellanTV", type: "movie" },
    { id: "streaming.mgl", name: "MagellanTV", type: "series" }
  ],
  cru: [
    { id: "streaming.cru", name: "Crunchyroll", type: "movie" },
    { id: "streaming.cru", name: "Crunchyroll", type: "series" }
  ],
  hay: [
    { id: "streaming.hay", name: "Hayu", type: "series" }
  ],
  clv: [
    { id: "streaming.clv", name: "Clarovideo", type: "movie" },
    { id: "streaming.clv", name: "Clarovideo", type: "series" }
  ],
  gop: [
    { id: "streaming.gop", name: "Globoplay", type: "movie" },
    { id: "streaming.gop", name: "Globoplay", type: "series" }
  ],
  hst: [
    { id: "streaming.hst", name: "Hotstar", type: "movie" },
    { id: "streaming.hst", name: "Hotstar", type: "series" }
  ],
  zee: [
    { id: "streaming.zee", name: "Zee5", type: "movie" },
    { id: "streaming.zee", name: "Zee5", type: "series" }
  ],
  nlz: [
    { id: "streaming.nlz", name: "NLZIET", type: "movie" },
    { id: "streaming.nlz", name: "NLZIET", type: "series" }
  ],
  vil: [
    { id: "streaming.vil", name: "Videoland", type: "movie" },
    { id: "streaming.vil", name: "Videoland", type: "series" }
  ],
  sst: [
    { id: "streaming.sst", name: "SkyShowtime", type: "movie" },
    { id: "streaming.sst", name: "SkyShowtime", type: "series" }
  ],
  blv: [
    { id: "streaming.blv", name: "BluTV", type: "movie" },
    { id: "streaming.blv", name: "BluTV", type: "series" }
  ],
  cpd: [
    { id: "streaming.cpd", name: "Canal+", type: "movie" },
    { id: "streaming.cpd", name: "Canal+", type: "series" }
  ],
  dpe: [
    { id: "streaming.dpe", name: "Discovery+", type: "movie" },
    { id: "streaming.dpe", name: "Discovery+", type: "series" }
  ]
}; 