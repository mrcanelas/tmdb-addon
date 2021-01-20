const { MovieDb } = require("moviedb-promise");
const moviedb = new MovieDb(process.env.tmdb_api);

async function getDirector(type, language, tmdbId) {
  if (type === "movie") {
    const catalog = moviedb
      .movieCredits({ language: language, id: tmdbId })
      .then((res) => {
        const resp = res.crew;
        return resp;
      })
      .catch(console.error);
    return catalog
  } else {
    const catalog = moviedb
      .tvCredits({ language: language, id: tmdbId })
      .then((res) => {
        const resp = res.crew;
        return resp;
      })
      .catch(console.error);
    return catalog
  }
}

module.exports = { getDirector };
