require('dotenv').config()
const axios = require('axios')

async function getSearch(type, language, query) {
  if (type === "movie") {
    const catalog = await axios
      .get(`https://api.themoviedb.org/3/search/movie?api_key=${process.env.tmdb_api}&language=${language}&query=${query}&include_adult=false`)
      .then((res) => {
        res = res.data
        const metas = res.results.map((el) => {
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
    const catalog = await axios
      .get(`https://api.themoviedb.org/3/search/tv?api_key=${process.env.tmdb_api}&language=${language}&query=${query}&include_adult=false`)
      .then((res) => {
        res = res.data
        const metas = res.results.map((el) => {
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