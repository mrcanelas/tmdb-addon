require("dotenv").config();
const { MovieDb } = require('moviedb-promise')
const moviedb = new MovieDb(process.env.tmdb_api)
const { cacheWrapMeta } = require("./getCache");
const { getMeta } = require("./getMeta");

async function getCatalog(type, language, page) {
  if (type === "movie") {
    return await moviedb
      .discoverMovie({language, page, })
      .then(async (res) => {
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
    return await moviedb
      .discoverTv({language, page})
      .then(async (res) => {
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
