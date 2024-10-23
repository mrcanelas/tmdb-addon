require("dotenv").config();
const { MovieDb } = require("moviedb-promise");
const moviedb = new MovieDb(process.env.TMDB_API);
const { getGenreList } = require("./getGenreList");
const { getLanguages } = require("./getLanguages");
const { getTrending } = require("./getTrending");
const { parseMedia } = require("../utils/parseProps");

async function getCatalog(type, id, language, genre, page) {
  if (id === "tmdb.top" && !genre) {return await getTrending(type, id, language, "week", page)}
  var parameters = {
    language: language,
    page: page,
  };
  const genre_id = await getGenreList(language, type);
  const languages = await getLanguages();
  if (type === "movie") {
    if (id === "tmdb.top") {
      let gen_name = ''
      if (genre) {
        gen_name = genre
          ? (genre_id.find((x) => x.name === genre) || {}).id || ''
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
        const metas = res.results.map(el => parseMedia(el, 'movie', genre_id));
        return { metas };
      })
      .catch(console.error);
  } else {
    if (id === "tmdb.top") {
      parameters.watch_region = language.split('-')[1]
      parameters.with_watch_monetization_types = "flatrate|free|ads|rent|buy"
      let gen_name = ''
      if (genre) {
        gen_name = genre
          ? (genre_id.find((x) => x.name === genre) || {}).id || ''
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
        const metas = res.results.map(el => parseMedia(el, 'tv', genre_id));
        return { metas };
      })
      .catch(console.error);
  }
}

module.exports = { getCatalog };
