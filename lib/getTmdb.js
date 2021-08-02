require('dotenv').config()
const { MovieDb } = require("moviedb-promise");
const moviedb = new MovieDb(process.env.tmdb_api);

async function getTmdb(type, imdbId) {
  if (type === "movie") {
    const tmdbId = moviedb
    .find({ id: imdbId, external_source: "imdb_id" })
    .then((res) => {
      const resp = res.movie_results[0].id;
      return resp;
    })
    .catch(console.error);
return tmdbId;
  } else {
    const tmdbId = moviedb
    .find({ id: imdbId, external_source: "imdb_id" })
    .then((res) => {
      const resp = res.tv_results[0].id;
      return resp;
    })
    .catch(console.error);
return tmdbId;
  }
}

module.exports = { getTmdb };
