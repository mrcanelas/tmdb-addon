require('dotenv').config()
const { getTmdbClient } = require('../utils/getTmdbClient')

async function getTmdb(type, imdbId) {
  try {
    const moviedb = getTmdbClient();
    if (type === "movie") {
      const tmdbId = await moviedb
        .find({ id: imdbId, external_source: 'imdb_id' })
        .then((res) => {
          return res.movie_results[0] ? res.movie_results[0].id : null;
        });
      return tmdbId;
    } else {
      const tmdbId = await moviedb
        .find({ id: imdbId, external_source: 'imdb_id' })
        .then((res) => {
          return res.tv_results[0] ? res.tv_results[0].id : null;
        });
      return tmdbId;
    }
  } catch (err) {
    if (err.message !== "TMDB_API_KEY_MISSING") {
      console.error(`Error in getTmdb conversion for ${imdbId}:`, err.message);
    }
    return null;
  }
}

module.exports = { getTmdb };
