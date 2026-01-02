require("dotenv").config();
const { TMDBClient } = require("../utils/tmdbClient");
const moviedb = new TMDBClient(process.env.TMDB_API);
const { getMeta } = require("./getMeta");
const { isMovieReleasedInRegion, isMovieReleasedDigitally } = require("./releaseFilter");

async function getTrending(type, language, page, genre, config) {
  const media_type = type === "series" ? "tv" : type;

  const isStrictMode = (config.strictRegionFilter === "true" || config.strictRegionFilter === true);
  const isDigitalFilterMode = (config.digitalReleaseFilter === "true" || config.digitalReleaseFilter === true);
  const region = language && language.split('-')[1] ? language.split('-')[1] : null;
  const needsExtraFetch = type === "movie" && (isStrictMode || isDigitalFilterMode);

  const MIN_RESULTS = 20;
  const PAGES_TO_FETCH = needsExtraFetch ? 5 : 1;

  // Helper function to fetch and filter one page
  async function fetchAndFilterPage(pageNum) {
    const parameters = {
      media_type,
      time_window: genre ? genre.toLowerCase() : "day",
      language,
      page: pageNum,
    };

    const res = await moviedb.trending(parameters);

    const metaPromises = res.results.map(item =>
      getMeta(type, language, item.id, config)
        .then(result => result.meta)
        .catch(err => {
          console.error(`Error fetching metadata for ${item.id}:`, err.message);
          return null;
        })
    );

    let metas = (await Promise.all(metaPromises)).filter(Boolean);

    // Apply strict region filtering for movies
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

    // Apply digital release filter for movies (independent from strict mode)
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

    return metas;
  }

  try {
    const startPage = parseInt(page) || 1;

    // Fetch all pages in parallel for better performance
    const pagePromises = [];
    for (let i = 0; i < PAGES_TO_FETCH; i++) {
      pagePromises.push(fetchAndFilterPage(startPage + i));
    }

    const pageResults = await Promise.all(pagePromises);

    // Combine results, removing duplicates
    let metas = [];
    for (const pageMetas of pageResults) {
      for (const meta of pageMetas) {
        if (!metas.find(m => m.id === meta.id)) {
          metas.push(meta);
        }
      }
      // Stop early if we have enough results
      if (metas.length >= MIN_RESULTS) break;
    }

    // Limit to 20 results max
    return { metas: metas.slice(0, 20) };
  } catch (error) {
    console.error(error);
    return { metas: [] };
  }
}

module.exports = { getTrending };
