require('dotenv').config()
const { getTmdbClient } = require('../utils/getTmdbClient')

// Fallback genres when TMDB API key is not available
const FALLBACK_MOVIE_GENRES = require("../static/fallback-genres-movie.json");
const FALLBACK_TV_GENRES = require("../static/fallback-genres-series.json");

const { cacheWrap } = require('./getCache');

async function getGenreList(language, type, config = {}) {
  const cacheKey = `genres:${language}:${type}`;

  return await cacheWrap(cacheKey, async () => {
    try {
      const moviedb = getTmdbClient(config);
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
      // If TMDB API key is missing or invalid, return fallback genres
      if (error.message === "TMDB_API_KEY_MISSING" || error.message === "TMDB_API_KEY_INVALID") {
        console.warn(`TMDB API key not available or invalid, using fallback ${type} genres`);
        return type === "movie" ? FALLBACK_MOVIE_GENRES : FALLBACK_TV_GENRES;
      }
      console.error(`Error fetching ${type} genres:`, error.message);
      return type === "movie" ? FALLBACK_MOVIE_GENRES : FALLBACK_TV_GENRES;
    }
  }, { ttl: 30 * 24 * 60 * 60 }); // Cache for 30 days
}

module.exports = { getGenreList };
