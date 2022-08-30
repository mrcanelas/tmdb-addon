require("dotenv").config();
const { MovieDb } = require('moviedb-promise')
const moviedb = new MovieDb(process.env.tmdb_api)
const { getGenreList } = require("./getGenreList");
const { cacheWrapMeta } = require("./getCache");
const { getMeta } = require("./getMeta");

function isNumeric(value) {
  return /^\d+$/.test(value);
}

async function getCatalog(type, language, genre, page) {
  const genre_id = await getGenreList(language, type);
  if (type === "movie") {
    if (isNumeric(genre)) {
      var parameters = {
        language,
        page,
        primary_release_year: genre,
        include_adult: "false",
      };
    } else {
      const gen_name = genre_id.find((x) => x.name === genre).id;
      var parameters = {
        language: language,
        page: page,
        with_genres: gen_name,
        include_adult: "false",
      };
    }
    return await moviedb
    .discoverMovie(parameters)
      .then(async (res) => {
        const metas = await Promise.all(
          res.results.map(async (el) => {
            const meta = await cacheWrapMeta(`${language}:${el.id}`, async () => {
              return await getMeta(type, language, el.id)
            })
            return meta.meta;
          })
        );
        return {metas}
      })
      .catch(console.error);
  } else {
    if (isNumeric(genre)) {
      var parameters = {
        language,
        page,
        first_air_date_year: genre,
        include_adult: "false",
      };
    } else {
      const gen_name = genre_id.find((x) => x.name === genre).id;
      var parameters = {
        language,
        page,
        with_genres: gen_name,
        include_adult: "false",
      };
    }
    return await moviedb
    .discoverTv(parameters)
      .then(async (res) => {
        const metas = await Promise.all(
          res.results.map(async (el) => {
            const meta = await cacheWrapMeta(`${language}:${el.id}`, async () => {
              return await getMeta(type, language, el.id)
            })
            return meta.meta;
          })
        );
        return {metas}
      })
      .catch(console.error);
  }
}

module.exports = { getCatalog };
