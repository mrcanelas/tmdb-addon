interface Integration {
  id: string;
  name: string;
  icon: string;
  description: string;
}

export const integrations: Integration[] = [
  {
    id: "tmdb",
    name: "TMDB Lists",
    icon: "https://www.themoviedb.org/assets/2/v4/logos/v2/blue_square_2-d537fb228cf3ded904ef09b136fe3fec72548ebc1fea3fbbd1ad9e36364db38b.svg",
    description: "Sync your TMDB lists to discover new movies and TV shows.",
  },
  {
    id: "rpdb",
    name: "Rating Poster Database",
    icon: "https://github.com/RatingPosterDB.png",
    description: "Add ratings and scores to your movies and TV shows posters.",
  },
  {
    id: "topposters",
    name: "Top Posters",
    icon: "https://api.top-streaming.stream/favicon.ico",
    description: "High-quality posters with rating and trend badges. Takes priority over RPDB for posters.",
  },
  {
    id: "streaming",
    name: "Streaming Catalogs",
    icon: "https://www.svgrepo.com/show/303341/netflix-1-logo.svg",
    description: "Set up your streaming services to see content availability. Based on rleroi/Stremio-Streaming-Catalogs-Addon.",
  },
  {
    id: "mdblist",
    name: "MDBList",
    icon: "https://mdblist.com/static/mdblist.png",
    description: "Integrate your MDBList lists to expand your content library.",
  },
  {
    id: "gemini",
    name: "Gemini AI Search",
    icon: "https://www.shutterstock.com/image-vector/simple-ai-search-icon-can-600nw-2483540907.jpg",
    description: "Improve your searches using Google Gemini's artificial intelligence.",
  },
  {
    id: "groq",
    name: "Groq AI Search",
    icon: "https://github.com/groq.png",
    description: "Ultra-fast AI search using Groq (Llama 3).",
  },
  {
    id: "trakt",
    name: "Trakt",
    icon: "https://trakt.tv/assets/logos/logomark.square.gradient-b644b16c38ff775861b4b1f58c1230f6a097a2466ab33ae00445a505c33fcb91.svg",
    description: "Track what you watch and sync your progress with Trakt.tv.",
  },


]; 