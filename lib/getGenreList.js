import 'dotenv/config';
import { MovieDb } from 'moviedb-promise';
const moviedb = new MovieDb(process.env.tmdb_api)

async function getGenreList(language, type) {
  if (type === "movie") {
    const genre = await moviedb
      .genreMovieList({ language })
      .then(({ genres }) => genres)
      .catch(console.error);
    return genre
  } else {
    const genre = await moviedb
      .genreTvList({ language })
      .then(({ genres }) => genres)
      .catch(console.error);
    return genre
  }
}

export default getGenreList;
