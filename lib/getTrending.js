require("dotenv").config();
const { MovieDb } = require("moviedb-promise");
const moviedb = new MovieDb(process.env.TMDB_API);
const { getGenreList } = require("./getGenreList");

async function getTrending(type, id, language, genre, page) {
  const parameters = {
    media_type: type === "series" ? "tv" : type,
    time_window: genre.toLowerCase(),
    language,
    page,
  };
  const genre_id = await getGenreList(language, type);
  return await moviedb
    .trending(parameters)
    .then(async (res) => {
      const metas = res.results.map((el) => {
        return {
          id: `tmdb:${el.id}`,
          name: type === "movie" ? el.title : el.name,
          genre: el.genre_ids.map(genre => genre_id.find((x) => x.id === genre).name),
          poster: `https://image.tmdb.org/t/p/w500${el.poster_path}`,
          background: `https://image.tmdb.org/t/p/original${el.backdrop_path}`,
          posterShape: "regular",
          imdbRating: el.vote_average.toFixed(1),
          year: type === "movie" ? el.release_date ? el.release_date.substr(0, 4) : "" : el.first_air_date ? el.first_air_date.substr(0, 4) : "",
          type: type,
          description: el.overview,
        }
      })
      return { metas };
    })
    .catch(console.error);
}

module.exports = { getTrending };
