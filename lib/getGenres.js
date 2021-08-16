require("dotenv").config();
const axios = require("axios");
const { getGenreList } = require("./getGenreList");

function isNumeric(value) {
  return /^\d+$/.test(value);
}

async function getGenres(type, language, genre, page) {
  const genre_id = await getGenreList(language, type);
  if (type === "movie") {
    if (isNumeric(genre)) {
      var parameters = new URLSearchParams({
        api_key: process.env.tmdb_api,
        language: language,
        sort_by: "popularity.desc",
        page: page,
        primary_release_year: genre,
        include_adult: "false",
      }).toString();
    } else {
      const gen_name = genre_id.find((x) => x.name === genre).id;
      var parameters = new URLSearchParams({
        api_key: process.env.tmdb_api,
        language: language,
        sort_by: "popularity.desc",
        page: page,
        with_genres: gen_name,
        include_adult: "false",
      }).toString();
    }
    return await axios
      .get("https://api.themoviedb.org/3/discover/movie?" + parameters)
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
    if (isNumeric(genre)) {
      var parameters = new URLSearchParams({
        api_key: process.env.tmdb_api,
        language: language,
        sort_by: "popularity.desc",
        page: page,
        first_air_date_year: genre,
        include_adult: "false",
      }).toString();
    } else {
      const gen_name = genre_id.find((x) => x.name === genre).id;
      var parameters = new URLSearchParams({
        api_key: process.env.tmdb_api,
        language: language,
        sort_by: "popularity.desc",
        page: page,
        with_genres: gen_name,
        include_adult: "false",
      }).toString();
    }
    return await axios
      .get("https://api.themoviedb.org/3/discover/tv?" + parameters)
      .then(async (res) => {
        res = res.data
        return await Promise.all(
          res.results.map(async (el) => {
            const meta = await axios.get(
              `${process.env.localhost}/${language}/meta/series/tmdb:${el.id}.json`
            );
            delete meta.data.meta.behaviorHints;
            delete meta.data.meta.videos;
            return meta.data.meta;
          })
        );
      })
      .catch(console.error);
  }
}

module.exports = { getGenres };
