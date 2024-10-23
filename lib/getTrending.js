require("dotenv").config();
const { MovieDb } = require("moviedb-promise");
const moviedb = new MovieDb(process.env.TMDB_API);
const { getGenreList } = require("./getGenreList");
const { parseMedia } = require("../utils/parseProps");

async function getTrending(type, id, language, genre, page) {
  const media_type = type === "series" ? "tv" : type
  const parameters = {
    media_type,
    time_window: genre.toLowerCase(),
    language,
    page,
  };
  const genre_id = await getGenreList(language, type);
  return await moviedb
    .trending(parameters)
    .then(async (res) => {
      const metas = res.results.map(el => parseMedia(el, media_type, genre_id));
      return { metas };
    })
    .catch(console.error);
}

module.exports = { getTrending };
