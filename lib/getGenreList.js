require('dotenv').config()
const axios = require('axios')

async function getGenreList(language, type) {
  if (type === "movie") {
    const genre = await axios
      .get(`https://api.themoviedb.org/3/genre/movie/list?api_key=${process.env.tmdb_api}&language=${language}`)
      .then((res) => {
        res = res.data
        return res.genres;
      })
      .catch(console.error);
      return genre
  } else {
    const genre = await axios
    .get(`https://api.themoviedb.org/3/genre/tv/list?api_key=${process.env.tmdb_api}&language=${language}`)
    .then((res) => {
      res = res.data
      return res.genres;
    })
    .catch(console.error);
    return genre
  }
}

module.exports = { getGenreList };
