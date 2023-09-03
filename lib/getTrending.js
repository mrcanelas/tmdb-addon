import "dotenv/config"
import { MovieDb } from "moviedb-promise";
const moviedb = new MovieDb(process.env.tmdb_api);
import getMeta from "./getMeta.js";

async function getTrending(type, id, language, genre, page, include_adult) {
  const parameters = {
    media_type: type === "series" ? "tv" : type,
    time_window: genre.toLowerCase(),
    language,
    page,
    include_adult,
  };
  return await moviedb
    .trending(parameters)
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

export default getTrending;
