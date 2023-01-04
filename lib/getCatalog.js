require("dotenv").config();
const { MovieDb } = require("moviedb-promise");
const moviedb = new MovieDb(process.env.tmdb_api);
const { getGenreList } = require("./getGenreList");
const { cacheWrapMeta } = require("./getCache");
const { getMeta } = require("./getMeta");
const { getLanguages } = require("./getLanguages");

async function getCatalog(type, id, language, genre, page) {
  var parameters = {
    language: language,
    page: page,
    include_adult: "false",
  };
  const genre_id = await getGenreList(language, type);
  const languages = await getLanguages();
  if (type === "movie") {
    if (id === "tmdb.top") {
      let gen_name = false
      if (genre) {
        gen_name = genre
          ? (genre_id.find((x) => x.name === genre) || {}).id || false
          : genre;
        if (!gen_name) return Promise.reject(Error(`Could not find genre: ${genre}`))
      }
      parameters.with_genres = gen_name
    } else if (id === "tmdb.year") {
      parameters.primary_release_year = genre
    } else if (id === "tmdb.language") {
      parameters.with_original_language = languages
        .find((lang) => lang.name === genre)
        .iso_639_1.split("-")[0]
    }
    return await moviedb
      .discoverMovie(parameters)
      .then(async (res) => {
        const metas = await Promise.all(
          res.results.map(async (el) => {
            const meta = await cacheWrapMeta(`${language}:${type}:${el.id}`, async () => {
              return await getMeta(type, language, el.id)
            })
            return meta.meta;
          })
        );
        return { metas };
      })
      .catch(console.error);
  } else {
    if (id === "tmdb.top") {
      let gen_name = false
      if (genre) {
        gen_name = genre
          ? (genre_id.find((x) => x.name === genre) || {}).id || false
          : genre;
        if (!gen_name) return Promise.reject(Error(`Could not find genre: ${genre}`))
      }
      parameters.with_genres = gen_name
    } else if (id === "tmdb.year") {
      parameters.first_air_date_year = genre
    } else if (id === "tmdb.language") {
      parameters.with_original_language = languages
        .find((lang) => lang.name === genre)
        .iso_639_1.split("-")[0]
    }
    return await moviedb
      .discoverTv(parameters)
      .then(async (res) => {
        const metas = await Promise.all(
          res.results.map(async (el) => {
            const meta = await cacheWrapMeta(`${language}:${type}:${el.id}`, async () => {
              return await getMeta(type, language, el.id)
            })
            return meta.meta;
          })
        );
        return { metas };
      })
      .catch(console.error);
  }
}

module.exports = { getCatalog };
