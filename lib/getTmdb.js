require('dotenv').config()
const axios = require('axios')

async function getTmdb(type, imdbId) {
  if (type === "movie") {
    const tmdbId = await axios
    .get(`https://api.themoviedb.org/3/find/${imdbId}?api_key=${process.env.tmdb_api}&language=en-US&external_source=imdb_id`)
    .then((res) => {
      res = res.data
      return res.movie_results[0] ? res.movie_results[0].id : null;
    })
    .catch(err => {
      return null
    });
return tmdbId;
  } else {
    const tmdbId = axios
    .get(`https://api.themoviedb.org/3/find/${imdbId}?api_key=${process.env.tmdb_api}&language=en-US&external_source=imdb_id`)
    .then((res) => {
      res = res.data
      return res.tv_results[0] ? res.tv_results[0].id : null;
    })
    .catch(err => {
      return null
    });
return tmdbId;
  }
}

module.exports = { getTmdb };
