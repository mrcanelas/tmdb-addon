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
  const MAX_PAGES = 3;

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
    let metas = [];
    let currentPage = parseInt(page) || 1;
    let pagesChecked = 0;

    // Fetch results, getting more pages if needed when filtering is active
    while (metas.length < MIN_RESULTS && pagesChecked < MAX_PAGES) {
      const pageMetas = await fetchAndFilterPage(currentPage);

      // Add unique results only
      for (const meta of pageMetas) {
        if (!metas.find(m => m.id === meta.id)) {
          metas.push(meta);
        }
      }

      pagesChecked++;
      currentPage++;

      // If not in filter mode, only fetch one page
      if (!needsExtraFetch) break;
    }

    // Limit to 20 results max
    return { metas: metas.slice(0, 20) };
  } catch (error) {
    console.error(error);
    return { metas: [] };
  }
}

module.exports = { getTrending };
