require("dotenv").config();
const axios = require("axios");
const { cacheWrapMeta } = require("./getCache");
const { getMeta } = require("./getMeta");

async function getCatalog(type, language, page) {
  if (type === "movie") {
    return await axios
      .get(`https://api.themoviedb.org/3/discover/movie?api_key=${process.env.tmdb_api}&language=${language}&sort_by=popularity.desc&include_adult=false&page=${page}`)
      .then(async (res) => {
        res = res.data
        return await Promise.all(
          res.results.map(async (el) => {
            const meta = await cacheWrapMeta(`${language}:${el.id}`, async () => {
              return await getMeta(type, language, el.id)
            })
            delete meta.meta.behaviorHints;
            delete meta.meta.videos;
            return meta.meta;
          })
        );
      })
      .catch(console.error);
  } else {
    return await axios
      .get(`https://api.themoviedb.org/3/discover/tv?api_key=${process.env.tmdb_api}&language=${language}&sort_by=popularity.desc&include_adult=false&page=${page}`)
      .then(async (res) => {
        res = res.data
        return await Promise.all(
          res.results.map(async (el) => {
            const meta = await cacheWrapMeta(`${language}:${el.id}`, async () => {
              return await getMeta(type, language, el.id)
            })
            delete meta.meta.videos;
            return meta.meta;
          })
        );
      })
      .catch(console.error);
  }
}

module.exports = { getCatalog };
