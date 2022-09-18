require("dotenv").config();
const { MovieDb } = require('moviedb-promise')
const moviedb = new MovieDb(process.env.tmdb_api)
const { getGenreList } = require("./getGenreList");
const { cacheWrapMeta } = require("./getCache");
const { getMeta } = require("./getMeta");
const { getLanguages } = require("./getLanguages");

async function getCatalog(type, id, language, genre, page) {
  const genre_id = await getGenreList(language, type);
  const languages = await getLanguages() 
  if (type === "movie") {
    if (id === "tmdb.top") {
      const gen_name = genre ? genre_id.find((x) => x.name === genre).id : genre;
      var parameters = {
        language: language,
        page: page,
        with_genres: gen_name,
        include_adult: "false",
      };
    } else if (id === "tmdb.year") {
      var parameters = {
        language,
        page,
        primary_release_year: genre,
        include_adult: "false",
      };
    } else if (id === "tmdb.language") {
      var parameters = {
        language,
        page,
        with_original_language: languages.find(lang => lang.name === genre).iso_639_1.split('-')[0],
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
    if (id === "tmdb.top") {
      const gen_name = genre ? genre_id.find((x) => x.name === genre).id : genre;
      var parameters = {
        language: language,
        page: page,
        with_genres: gen_name,
        include_adult: "false",
      };
    } else if (id === "tmdb.year") {
      var parameters = {
        language,
        page,
        primary_release_year: genre,
        include_adult: "false",
      };
    } else if (id === "tmdb.language") {
      var parameters = {
        language,
        page,
        with_original_language: languages.find(lang => lang.name === genre).iso_639_1.split('-')[0],
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
