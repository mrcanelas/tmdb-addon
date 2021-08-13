require("dotenv").config();
const axios = require("axios");
const path = require("path");
const { MovieDb } = require("moviedb-promise");
const { getGenreList } = require("./getGenreList");
const moviedb = new MovieDb(process.env.tmdb_api);

function isNumeric(value) {
  return /^\d+$/.test(value);
}

async function getGenres(type, language, genre, page) {
  const genre_id = await getGenreList(language, type);
  if (type === "movie") {
    if (isNumeric(genre)) {
      var parameters = {
        language: language,
        page: page,
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
    const catalog = moviedb
      .discoverMovie(parameters)
      .then(async (res) => {
        const metas = await Promise.all(
          res.results.map(async (el) => {
            const meta = await axios.get(`${process.env.localhost}/${language}/meta/movie/tmdb:${el.id}.json`)
            return meta.data.meta;
          })
        );
        return Promise.resolve({ metas });
      })
      .catch(console.error);
    return catalog;
  } else {
    if (isNumeric(genre)) {
      var parameters = {
        language: language,
        page: page,
        first_air_date_year: genre,
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
    const catalog = moviedb
      .discoverTv(parameters)
      .then(async (res) => {
        const metas = await Promise.all(
          res.results.map(async (el) => {
            const meta = await axios.get(`${process.env.localhost}/${language}/meta/series/tmdb:${el.id}.json`)
            return meta.data.meta;
          })
        );
        return Promise.resolve({ metas });
      })
      .catch(console.error);
    return catalog;
  }
}

module.exports = { getGenres };
