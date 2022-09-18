require("dotenv").config();
const { MovieDb } = require("moviedb-promise");
const moviedb = new MovieDb(process.env.tmdb_api);
const { cacheWrapMeta } = require("./getCache");
const { getMeta } = require("./getMeta");

async function getTrending(type, id, language, genre, page) {
  const parameters = {
    media_type: type === "series" ? "tv" : type,
    time_window: genre.toLowerCase(),
    language,
    page,
  };
  return await moviedb
    .trending(parameters)
    .then(async (res) => {
      const metas = await Promise.all(
        res.results.map(async (el) => {
          const meta = await cacheWrapMeta(`${language}:${el.id}`, async () => {
            return await getMeta(type, language, el.id);
          });
          return meta.meta;
        })
      );
      return { metas };
    })
    .catch(console.error);
}

module.exports = { getTrending };
