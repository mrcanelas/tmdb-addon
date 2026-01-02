require("dotenv").config();
const { TMDBClient } = require("../utils/tmdbClient");
const moviedb = new TMDBClient(process.env.TMDB_API);
const { getMeta } = require("./getMeta");
const { isMovieReleasedInRegion, isMovieReleasedDigitally } = require("./releaseFilter");

async function getTrending(type, language, page, genre, config) {
  const media_type = type === "series" ? "tv" : type;
  const parameters = {
    media_type,
    time_window: genre ? genre.toLowerCase() : "day",
    language,
    page,
  };

  // Always use the real trending API to get truly trending content
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

      let metas = (await Promise.all(metaPromises)).filter(Boolean);

      // Apply strict region filtering post-fetch if enabled
      // This filters trending results to only show content released in the user's region
      const isStrictMode = (config.strictRegionFilter === "true" || config.strictRegionFilter === true);
      const isDigitalFilterMode = (config.digitalReleaseFilter === "true" || config.digitalReleaseFilter === true);
      const region = language && language.split('-')[1] ? language.split('-')[1] : null;

      if (isStrictMode && region && type === "movie") {
        const releaseChecks = await Promise.all(
          metas.map(async (meta) => {
            const tmdbId = meta.id ? parseInt(meta.id.replace('tmdb:', ''), 10) : null;
            if (!tmdbId) return { meta, released: true };

            const released = await isMovieReleasedInRegion(tmdbId, region);
            return { meta, released };
          })
        );

        metas = releaseChecks
          .filter(check => check.released)
          .map(check => check.meta);
      }

      // Apply digital release filter for movies (global, any region) - independent from strict mode
      if (isDigitalFilterMode && !isStrictMode && type === "movie") {
        const digitalChecks = await Promise.all(
          metas.map(async (meta) => {
            const tmdbId = meta.id ? parseInt(meta.id.replace('tmdb:', ''), 10) : null;
            if (!tmdbId) return { meta, released: true };

            const released = await isMovieReleasedDigitally(tmdbId);
            return { meta, released };
          })
        );

        metas = digitalChecks
          .filter(check => check.released)
          .map(check => check.meta);
      }

      return { metas };
    })
    .catch(console.error);
}

module.exports = { getTrending };
