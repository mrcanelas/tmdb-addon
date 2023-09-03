require('dotenv').config()
const { MovieDb } = require('moviedb-promise')
const moviedb = new MovieDb(process.env.TMDB_API)

async function getTmdb(type, imdbId) {
  if (type === "movie") {
    const tmdbId = await moviedb
    .find({id: imdbId, external_source: 'imdb_id'})
    .then((res) => {
      return res.movie_results[0] ? res.movie_results[0].id : null;
    })
    .catch(err => {
      return null
    });
return tmdbId;
  } else {
    const tmdbId = await moviedb
    .find({id: imdbId, external_source: 'imdb_id'})
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
