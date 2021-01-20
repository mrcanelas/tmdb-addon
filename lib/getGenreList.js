const { MovieDb } = require("moviedb-promise");
const moviedb = new MovieDb(process.env.tmdb_api);

async function getGenreList(language, type) {
  if (type === "movie") {
    const genre = moviedb
      .genreMovieList({ language: language })
      .then((res) => {
        return res.genres;
      })
      .catch(console.error);
      return genre
  } else {
    const genre = moviedb
    .genreTvList({ language: language })
    .then((res) => {
        return res.genres;
    })
    .catch(console.error);
    return genre
  }
}

module.exports = { getGenreList };
