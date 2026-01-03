require('dotenv').config()
const { getTmdbClient } = require('../utils/getTmdbClient')

async function getTmdb(type, imdbId) {
  const moviedb = getTmdbClient();
  if (type === "movie") {
    const tmdbId = await moviedb
      .find({ id: imdbId, external_source: 'imdb_id' })
      .then((res) => {
        return res.movie_results[0] ? res.movie_results[0].id : null;
      })
      .catch(err => {
        return null
      });
    return tmdbId;
  } else {
    const tmdbId = await moviedb
      .find({ id: imdbId, external_source: 'imdb_id' })
      .then((res) => {
        return res.tv_results[0] ? res.tv_results[0].id : null;
      })
      .catch(err => {
        return null
      });
    return tmdbId;
  }
}

module.exports = { getTmdb };
