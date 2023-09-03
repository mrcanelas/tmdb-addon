import "dotenv/config"
import { MovieDb } from "moviedb-promise";
const moviedb = new MovieDb(process.env.tmdb_api);
import getGenreList from "./getGenreList.js";
import getLanguages from "./getLanguages.js";

async function getCatalog(type, id, language, genre, page, include_adult) {
  const parameters = {
    language,
    page,
    include_adult,
  };
  const genre_id = await getGenreList(language, type);
  const languages = await getLanguages();
  if (type === "movie") {
    if (id === "tmdb.top") {
      let gen_name = false
      if (genre) {
        gen_name = genre
          ? (genre_id.find(({ name }) => name === genre) || {}).id || false
          : genre;
        if (!gen_name) return Promise.reject(Error(`Could not find genre: ${genre}`))
      }
      parameters.with_genres = gen_name
    } else if (id === "tmdb.year") {
      parameters.primary_release_year = genre
    } else if (id === "tmdb.language") {
      parameters.with_original_language = languages
        .find(({ name }) => name === genre)
        .iso_639_1.split("-")[0]
    }
    return await moviedb
      .discoverMovie(parameters)
      .then(async ({ results }) => {
        const metas = results.map(el => ({
          id: `tmdb:${el.id}`,
          name: el.title,
          genre: el.genre_ids.map(genre => genre_id.find((x) => x.id === genre).name),
          poster: `https://image.tmdb.org/t/p/w500${el.poster_path}`,
          background: `https://image.tmdb.org/t/p/original${el.backdrop_path}`,
          posterShape: "regular",
          imdbRating: el.vote_average,
          year: el.release_date ? el.release_date.substr(0, 4) : "",
          type,
          description: el.overview
        }))
        return { metas };
      })
      .catch(console.error);
  } else {
    if (id === "tmdb.top") {
      parameters.watch_region = language.split('-')[1]
      parameters.with_watch_monetization_types = "flatrate|free|ads|rent|buy"
      let gen_name = false
      if (genre) {
        gen_name = genre
          ? (genre_id.find(({ name }) => name === genre) || {}).id || false
          : genre;
        if (!gen_name) return Promise.reject(Error(`Could not find genre: ${genre}`))
      }
      parameters.with_genres = gen_name
    } else if (id === "tmdb.year") {
      parameters.first_air_date_year = genre
    } else if (id === "tmdb.language") {
      parameters.with_original_language = languages
        .find(({ name }) => name === genre)
        .iso_639_1.split("-")[0]
    }
    return await moviedb
      .discoverTv(parameters)
      .then(async ({ results }) => {
        const metas = results.map(el => ({
          id: `tmdb:${el.id}`,
          name: el.name,
          genre: el.genre_ids.map(genre => genre_id.find((x) => x.id === genre).name),
          poster: `https://image.tmdb.org/t/p/w500${el.poster_path}`,
          background: `https://image.tmdb.org/t/p/original${el.backdrop_path}`,
          posterShape: "regular",
          imdbRating: el.vote_average,
          year: el.first_air_date ? el.first_air_date.substr(0, 4) : "",
          type,
          description: el.overview
        }))
        return { metas };
      })
      .catch(console.error);
  }
}

export default getCatalog
