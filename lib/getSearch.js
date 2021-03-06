require('dotenv').config()
const { MovieDb } = require("moviedb-promise");
const moviedb = new MovieDb(process.env.tmdb_api);

async function getSearch(type, language, query) {
  if (type === "movie") {
    const catalog = moviedb
      .searchMovie({ query: query, language: language, include_adult: 'true' })
      .then((res) => {
        const resp = res.results;
        const metas = resp.map((el) => {
          return {
            id: `tmdb:${el.id}`,
            name: `${el.title}`,
            poster: `https://image.tmdb.org/t/p/w500${el.poster_path}`,
            type: `${type}`,
          };
        });
        return Promise.resolve({ metas });
      })
      .catch(console.error);
    return catalog
  } else {
    const catalog = moviedb
      .searchTv({ query: query, language: language, include_adult: 'true' })
      .then((res) => {
        const resp = res.results;
        const metas = resp.map((el) => {
          return {
            id: `tmdb:${el.id}`,
            name: `${el.name}`,
            poster: `https://image.tmdb.org/t/p/w500${el.poster_path}`,
            type: `${type}`,
          };
        });
        return Promise.resolve({ metas });
      })
      .catch(console.error);
    return catalog
  }
}

module.exports = { getSearch };
