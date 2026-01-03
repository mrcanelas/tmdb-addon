require('dotenv').config()
const { getTmdbClient } = require('../utils/getTmdbClient')

// Fallback genres when TMDB API key is not available
const FALLBACK_MOVIE_GENRES = require("../static/fallback-genres-movie.json");
const FALLBACK_TV_GENRES = require("../static/fallback-genres-series.json");

async function getGenreList(language, type) {
  try {
    const moviedb = getTmdbClient();
    if (type === "movie") {
      const genre = await moviedb
        .genreMovieList({ language })
        .then((res) => {
          return res.genres;
        });
      return genre;
    } else {
      const genre = await moviedb
        .genreTvList({ language })
        .then((res) => {
          return res.genres;
        });
      return genre;
    }
  } catch (error) {
    // If TMDB API key is missing, return fallback genres
    if (error.message === "TMDB_API_KEY_MISSING") {
      console.warn(`TMDB API key not available, using fallback ${type} genres`);
      return type === "movie" ? FALLBACK_MOVIE_GENRES : FALLBACK_TV_GENRES;
    }
    console.error(`Error fetching ${type} genres:`, error.message);
    return type === "movie" ? FALLBACK_MOVIE_GENRES : FALLBACK_TV_GENRES;
  }
}

module.exports = { getGenreList };
