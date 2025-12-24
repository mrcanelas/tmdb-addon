require("dotenv").config();
const { TMDBClient } = require("../utils/tmdbClient");
const moviedb = new TMDBClient(process.env.TMDB_API);
const { getMeta } = require("./getMeta");

async function getTrending(type, language, page, genre, config) {
  // Check if we need to filter by specific region (strict mode)
  // TMDB Trending API doesn't support 'region', so we fallback to discover
  // effectively showing "Popular" content in that region as a proxy for "Trending"
  // ONLY if strict region filtering is enabled
  if ((config.strictRegionFilter === "true" || config.strictRegionFilter === true) && language && language.split('-')[1]) {
    const region = language.split('-')[1];
    const fetchFunction = type === "movie" ? moviedb.discoverMovie.bind(moviedb) : moviedb.discoverTv.bind(moviedb);

    const discoverParams = {
      language,
      page,
      region: region,
      sort_by: 'popularity.desc',
      'vote_count.gte': 10
    };

    return await fetchFunction(discoverParams)
      .then(async (res) => {
        const metaPromises = res.results.map(item =>
          getMeta(type, language, item.id, config)
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
        getMeta(type, language, item.id, config)
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
