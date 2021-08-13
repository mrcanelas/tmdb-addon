require("dotenv").config();
const axios = require("axios");
const path = require("path");
const { MovieDb } = require("moviedb-promise");
const moviedb = new MovieDb(process.env.tmdb_api);

async function getCatalog(type, language, page) {
  if (type === "movie") {
    const catalog = moviedb
      .discoverMovie({ language: language, page: page, include_adult: "false" })
      .then(async (res) => {
        const metas = await Promise.all(
          res.results.map(async (el) => {
            const meta = await axios.get(
              path.join(
                __dirname + `/${language}/meta/movie/tmdb:${el.id}.json`
              )
            );
            return meta.data.meta;
          })
        );
        return Promise.resolve({ metas });
      })
      .catch(console.error);
    return catalog;
  } else {
    const catalog = moviedb
      .discoverTv({ language: language, page: page, include_adult: "false" })
      .then(async (res) => {
        const metas = await Promise.all(
          res.results.map(async (el) => {
            const meta = await axios.get(
              path.join(
                __dirname + `/${language}/meta/series/tmdb:${el.id}.json`
              )
            );
            return meta.data.meta;
          })
        );
        return Promise.resolve({ metas });
      })
      .catch(console.error);
    return catalog;
  }
}

module.exports = { getCatalog };
