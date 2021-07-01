require('dotenv').config()
const { MovieDb } = require("moviedb-promise");
const moviedb = new MovieDb(process.env.tmdb_api);

async function getDirector(type, language, tmdbId) {
  if (type === "movie") {
    const catalog = moviedb
      .movieCredits({ language: language, id: tmdbId })
      .then((res) => {
        const resp = res.crew;
        const director = resp.filter((x) => x.job === "Director").map(el => { return el.name});
        return director;
      })
      .catch(console.error);
    return catalog
  } else {
    const catalog = moviedb
      .tvCredits({ language: language, id: tmdbId })
      .then((res) => {
        const resp = res.crew;
        const director = resp.filter((x) => x.job === "Director").map(el => { return el.name});
        return director;
      })
      .catch(console.error);
    return catalog
  }
}

module.exports = { getDirector };
