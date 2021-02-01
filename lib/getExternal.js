const { MovieDb } = require("moviedb-promise");
const moviedb = new MovieDb(process.env.tmdb_api);

async function getExternal(type, tmdbId) {
  if (type === "movie") {
    const catalog = moviedb
      .movieExternalIds({ id: tmdbId })
      .then((res) => {
        const resp = res;
        return resp;
      })
      .catch(console.error);
    return catalog
  } else {
    const catalog = moviedb
      .tvExternalIds({ id: tmdbId })
      .then((res) => {
        const resp = res;
        return resp;
      })
      .catch(console.error);
    return catalog
  }
}

module.exports = { getExternal };
