require("dotenv").config();
const { TMDBClient } = require("../utils/tmdbClient");
const moviedb = new TMDBClient(process.env.TMDB_API);
const { getMeta } = require("./getMeta");

async function getTrending(type, language, page, genre, config) {
  const media_type = type === "series" ? "tv" : type;
  const parameters = {
    media_type,
    time_window: genre ? genre.toLowerCase() : "day",
    language,
    page,
  };

  return await moviedb
    .trending(parameters)
    .then(async (res) => {
      const metaPromises = res.results.map(item => 
        getMeta(type, language, item.id, config.rpdbkey)
          .then(result => result.meta)
          .catch(err => {
            console.error(`Error fetching metadata for ${item.id}:`, err.message);
            return null;
          })
      );

      const metas = (await Promise.all(metaPromises)).filter(Boolean);
      return { metas };
    })
    .catch(console.error);
}

module.exports = { getTrending };
