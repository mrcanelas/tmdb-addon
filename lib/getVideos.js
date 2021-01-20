const { MovieDb } = require("moviedb-promise");
const moviedb = new MovieDb(process.env.tmdb_api);

async function getVideos(type, language, tmdbId) {
  if (type === "movie") {
    const catalog = moviedb
      .movieVideos({ language: language, id: tmdbId })
      .then((res) => {
        const resp = res.results;
        return resp;
      })
      .catch(console.error);
    return catalog
  } else {
    const catalog = moviedb
      .tvVideos({ language: language, id: tmdbId })
      .then((res) => {
        const resp = res.results;
        return resp;
      })
      .catch(console.error);
    return catalog
  }
}

module.exports = { getVideos };
