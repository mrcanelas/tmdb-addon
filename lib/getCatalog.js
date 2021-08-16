require("dotenv").config();
const axios = require("axios");

async function getCatalog(type, language, page) {
  if (type === "movie") {
    return await axios
      .get(`https://api.themoviedb.org/3/discover/movie?api_key=${process.env.tmdb_api}&language=${language}&sort_by=popularity.desc&include_adult=false&page=${page}`)
      .then(async (res) => {
        res = res.data
        return await Promise.all(
          res.results.map(async (el) => {
            const meta = await axios.get(
              `${process.env.localhost}/${language}/meta/movie/tmdb:${el.id}.json`
            );
            delete meta.data.meta.behaviorHints;
            delete meta.data.meta.videos;
            return meta.data.meta;
          })
        );
      })
      .catch(console.error);
  } else {
    return await axios
      .get(`https://api.themoviedb.org/3/discover/movie?api_key=${process.env.tmdb_api}&language=${language}&sort_by=popularity.desc&include_adult=false&page=${page}`)
      .then(async (res) => {
        res = res.data
        return await Promise.all(
          res.results.map(async (el) => {
            const meta = await axios.get(
              `${process.env.localhost}/${language}/meta/series/tmdb:${el.id}.json`
            );
            delete meta.data.meta.videos;
            return meta.data.meta;
          })
        );
      })
      .catch(console.error);
  }
}

module.exports = { getCatalog };
