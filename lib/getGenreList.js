const { MovieDb } = require("moviedb-promise");
const moviedb = new MovieDb("5a5366fc507321122c90b2b809b5ab20");

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
