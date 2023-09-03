import "dotenv/config"
import { MovieDb } from "moviedb-promise";
const moviedb = new MovieDb(process.env.tmdb_api);
import getGenreList from "./getGenreList.js";
import getLanguages from "./getLanguages.js";
import getMeta from "./getMeta.js";

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
        const metas = await Promise.all(
          results.map(async (el) => {
            const meta = await getMeta(type, language, el.id);
            return meta.meta;
          })
        );
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
        const metas = await Promise.all(
          results.map(async (el) => {
            const meta = await getMeta(type, language, el.id);
            return meta.meta;
          })
        );
        return { metas };
      })
      .catch(console.error);
  }
}

export default getCatalog
