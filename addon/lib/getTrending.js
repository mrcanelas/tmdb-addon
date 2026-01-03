require("dotenv").config();
const { getTmdbClient } = require("../utils/getTmdbClient");
const { getMeta } = require("./getMeta");
const { isMovieReleasedInRegion, isMovieReleasedDigitally } = require("./releaseFilter");
const { rateLimitedMapFiltered } = require("../utils/rateLimiter");

async function getTrending(type, language, page, genre, config) {
  const moviedb = getTmdbClient(config);
  const media_type = type === "series" ? "tv" : type;

  const isStrictMode = (config.strictRegionFilter === "true" || config.strictRegionFilter === true);
  const isDigitalFilterMode = (config.digitalReleaseFilter === "true" || config.digitalReleaseFilter === true);
  const region = language && language.split('-')[1] ? language.split('-')[1] : null;
  const needsExtraFetch = type === "movie" && (isStrictMode || isDigitalFilterMode);

  const MIN_RESULTS = 20;
  const PAGES_TO_FETCH = needsExtraFetch ? 3 : 1; // Reduced from 5 to 3 to minimize API calls

  // Helper function to fetch and filter one page
  async function fetchAndFilterPage(pageNum) {
    const parameters = {
      media_type,
      time_window: genre ? genre.toLowerCase() : "day",
      language,
      page: pageNum,
    };

    const res = await moviedb.trending(parameters);

    // Use rate-limited fetching to prevent 429 errors
    let metas = await rateLimitedMapFiltered(
      res.results,
      async (item) => {
        try {
          const result = await getMeta(type, language, item.id, config);
          return result.meta;
        } catch (err) {
          console.error(`Error fetching metadata for ${item.id}:`, err.message);
          return null;
        }
      },
      { batchSize: 5, delayMs: 200 }
    );

    // Apply strict region filtering for movies
    if (isStrictMode && region && type === "movie") {
      const releaseChecks = await rateLimitedMapFiltered(
        metas,
        async (meta) => {
          const tmdbId = meta.id ? parseInt(meta.id.replace('tmdb:', ''), 10) : null;
          if (!tmdbId) return meta; // Keep if no ID

          const released = await isMovieReleasedInRegion(tmdbId, region, config);
          return released ? meta : null;
        },
        { batchSize: 5, delayMs: 200 }
      );

      metas = releaseChecks;
    }

    // Apply digital release filter for movies (independent from strict mode)
    if (isDigitalFilterMode && !isStrictMode && type === "movie") {
      const digitalChecks = await rateLimitedMapFiltered(
        metas,
        async (meta) => {
          const tmdbId = meta.id ? parseInt(meta.id.replace('tmdb:', ''), 10) : null;
          if (!tmdbId) return meta; // Keep if no ID

          const released = await isMovieReleasedDigitally(tmdbId, config);
          return released ? meta : null;
        },
        { batchSize: 5, delayMs: 200 }
      );

      metas = digitalChecks;
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
