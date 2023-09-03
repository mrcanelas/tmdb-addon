import 'dotenv/config';
import { MovieDb } from 'moviedb-promise';
const moviedb = new MovieDb(process.env.tmdb_api)

async function getTmdb(type, imdbId) {
  if (type === "movie") {
    const tmdbId = await moviedb
      .find({ id: imdbId, external_source: 'imdb_id' })
      .then(({ movie_results }) => movie_results[0] ? movie_results[0].id : null)
      .catch(err => null);
    return tmdbId;
  } else {
    const tmdbId = await moviedb
      .find({ id: imdbId, external_source: 'imdb_id' })
      .then(({ tv_results }) => tv_results[0] ? tv_results[0].id : null)
      .catch(err => null);
    return tmdbId;
  }
}

export default getTmdb;
