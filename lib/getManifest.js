const { MovieDb } = require("moviedb-promise");
const moviedb = new MovieDb(process.env.tmdb_api);

const DEFAULT_LANGUAGE = "en-US";

async function getManifest(language = DEFAULT_LANGUAGE) {
  const genre = moviedb
    .genreMovieList({ language: language })
    .then((res) => {
      return res.genres;
    })
    .catch(console.error);
  const resp = await genre;
  const genres_movie = resp.map((el) => {
    return el.name;
  });
  const genre_tv = moviedb
    .genreTvList({ language: language })
    .then((res) => {
      return res.genres;
    })
    .catch(console.error);
  const resp2 = await genre_tv;
  const genres_series = resp2.map((el) => {
    return el.name;
  });
  const titleSuffix = language && language !== DEFAULT_LANGUAGE ? ` for ${language} language` : '';
  return {
    id: "tmdb.addon",
    version: "0.0.2",
    icon:
      "https://pbs.twimg.com/profile_images/1243623122089041920/gVZIvphd_400x400.jpg",
    name: "The Movie Database Addon" + titleSuffix,
    description: "TMDB API for Stremio.",
    resources: ["catalog", "meta"],
    types: ["movie", "series"],
    idPrefixes: ["tmdb:"],
    behaviorHints: {
      configurable: true,
      configurationRequired: false,
    },
    catalogs: [
      {
        type: "movie",
        id: "movie.top",
        extraSupported: ["search", "genre", "skip"],
        genres: genres_movie,
      },
      {
        type: "series",
        id: "series.top",
        extraSupported: ["search", "genre", "skip"],
        genres: genres_series,
      },
    ],
  };
}

module.exports = { getManifest, DEFAULT_LANGUAGE };
