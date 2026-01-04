require("dotenv").config();
const { getTmdbClient } = require("../utils/getTmdbClient");
const { getGenreList } = require("./getGenreList");
const { getLanguages } = require("./getLanguages");
const { parseMedia } = require("../utils/parseProps");
const { fetchMDBListItems, parseMDBListItems } = require("../utils/mdbList");
const { getMeta } = require("./getMeta");
const { isMovieReleasedInRegion, isMovieReleasedDigitally } = require("./releaseFilter");
const { rateLimitedMapFiltered } = require("../utils/rateLimiter");
const CATALOG_TYPES = require("../static/catalog-types.json");

async function getCatalog(type, language, page, id, genre, config) {
  const moviedb = getTmdbClient(config);
  const mdblistKey = config.mdblistkey

  if (id.startsWith("mdblist.")) {
    const listId = id.split(".")[1];
    const results = await fetchMDBListItems(listId, mdblistKey, language, page);
    const parseResults = await parseMDBListItems(results, type, genre, language, config);

    return parseResults
  }

  const genreList = await getGenreList(language, type, config);
  const parameters = await buildParameters(type, language, page, id, genre, genreList, config);

  console.log(`[getCatalog] id=${id}, type=${type}, genre=${genre}, params=`, JSON.stringify(parameters));

  const fetchFunction = type === "movie" ? moviedb.discoverMovie.bind(moviedb) : moviedb.discoverTv.bind(moviedb);

  // Check if this is a streaming catalog
  const providerId = id.split(".")[1];
  const isStreaming = Object.keys(CATALOG_TYPES.streaming).includes(providerId);
  const isStrictMode = (config.strictRegionFilter === "true" || config.strictRegionFilter === true);
  const isDigitalFilterMode = (config.digitalReleaseFilter === "true" || config.digitalReleaseFilter === true);
  const userRegion = language && language.split('-')[1] ? language.split('-')[1] : null;

  // Helper function to fetch and filter results
  async function fetchAndFilter(params, regionForReleaseCheck) {
    const res = await fetchFunction(params);

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

    // Apply strict region filtering for movies - check actual regional release dates
    // Skip for streaming catalogs since they already show only regionally available content
    if (type === "movie" && isStrictMode && regionForReleaseCheck && !isStreaming) {
      const releaseChecks = await rateLimitedMapFiltered(
        metas,
        async (meta) => {
          const tmdbId = meta.id ? parseInt(meta.id.replace('tmdb:', ''), 10) : null;
          if (!tmdbId) return meta; // Keep if no ID

          const released = await isMovieReleasedInRegion(tmdbId, regionForReleaseCheck, config);
          return released ? meta : null;
        },
        { batchSize: 5, delayMs: 200 }
      );

      metas = releaseChecks;
    }

    // Apply digital release filter for movies (global, any region) - independent from strict mode
    // Skip for streaming catalogs since they already show only available content
    if (type === "movie" && isDigitalFilterMode && !isStrictMode && !isStreaming) {
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
    // Determine if we need to fetch more results due to filtering
    // Skip extra fetch for streaming catalogs since neither filter applies to them
    const needsExtraFetch = type === "movie" && !isStreaming && (isStrictMode || isDigitalFilterMode);
    const MIN_RESULTS = 20;
    const PAGES_TO_FETCH = needsExtraFetch ? 3 : 1; // Reduced from 5 to 3 to minimize API calls

    const startPage = parseInt(page) || 1;

    // Fetch all pages in parallel for better performance
    const pagePromises = [];
    for (let i = 0; i < PAGES_TO_FETCH; i++) {
      const pageParams = { ...parameters, page: startPage + i };
      pagePromises.push(fetchAndFilter(pageParams, userRegion));
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

    // Fallback to US for streaming catalogs if no results and strict mode is on
    if (metas.length === 0 && isStreaming && isStrictMode && userRegion && userRegion !== 'US') {
      console.log(`No results for ${id} in ${userRegion}, falling back to US`);

      // Create new parameters with US region
      const fallbackParams = { ...parameters };
      fallbackParams.watch_region = 'US';

      metas = await fetchAndFilter(fallbackParams, 'US');
    }

    // If no results, return a placeholder to prevent iOS from bugging
    if (metas.length === 0) {
      return {
        metas: [{
          id: "tmdb:0",
          type: type,
          name: "No Content Available",
          poster: `${process.env.HOST_NAME || ''}/no-content.png`,
          description: "No content found for the selected filter. Please try a different option.",
          genres: ["No Results"]
        }]
      };
    }

    // Limit to 20 results max
    return { metas: metas.slice(0, 20) };
  } catch (error) {
    console.error(error);
    return {
      metas: [{
        id: "tmdb:0",
        type: type,
        name: "Error Loading Content",
        poster: `${process.env.HOST_NAME || ''}/no-content.png`,
        description: "An error occurred while loading content. Please try again.",
        genres: ["Error"]
      }]
    };
  }
}

async function buildParameters(type, language, page, id, genre, genreList, config) {
  const languages = await getLanguages(config);
  const parameters = { language, page, 'vote_count.gte': 10 };;

  if (config.ageRating) {
    switch (config.ageRating) {
      case "G":
        parameters.certification_country = "US";
        parameters.certification = type === "movie" ? "G" : "TV-G";
        break;
      case "PG":
        parameters.certification_country = "US";
        parameters.certification = type === "movie" ? ["G", "PG"].join("|") : ["TV-G", "TV-PG"].join("|");
        break;
      case "PG-13":
        parameters.certification_country = "US";
        parameters.certification = type === "movie" ? ["G", "PG", "PG-13"].join("|") : ["TV-G", "TV-PG", "TV-14"].join("|");
        break;
      case "R":
        parameters.certification_country = "US";
        parameters.certification = type === "movie" ? ["G", "PG", "PG-13", "R"].join("|") : ["TV-G", "TV-PG", "TV-14", "TV-MA"].join("|");
        break;
      case "NC-17":
        break;
    }
  }

  const providerId = id.split(".")[1];
  const isStreaming = Object.keys(CATALOG_TYPES.streaming).includes(providerId);

  if (isStreaming) {
    const provider = findProvider(providerId);

    parameters.with_genres = genre ? findGenreId(genre, genreList) : undefined;
    parameters.with_watch_providers = provider.watchProviderId;

    // Override default country with user region if available (e.g., IT for 'it-IT')
    // This allows seeing what is on Netflix IT, etc.
    // ONLY if strict region filtering is enabled
    if ((config.strictRegionFilter === "true" || config.strictRegionFilter === true) && language && language.split('-')[1]) {
      parameters.watch_region = language.split('-')[1];
      const today = new Date().toISOString().split('T')[0];
      if (type === "movie") {
        parameters['release_date.lte'] = today;
        parameters.with_release_type = "4|5|6";
      } else {
        parameters['first_air_date.lte'] = today;
      }
    } else {
      parameters.watch_region = provider.country;
    }

    parameters.with_watch_monetization_types = "flatrate|free|ads";
  } else {
    // Apply region filtering for "Top" and "Year" catalogs
    // This prioritizes content released in the selected region (e.g., Italy)
    // ONLY if strict region filtering is enabled
    if ((config.strictRegionFilter === "true" || config.strictRegionFilter === true) && (id === "tmdb.top" || id === "tmdb.year") && language && language.split('-')[1]) {
      parameters.region = language.split('-')[1];
      const today = new Date().toISOString().split('T')[0];
      if (type === "movie") {
        parameters['release_date.lte'] = today;
        parameters.with_release_type = "4|5|6";
      } else {
        parameters['first_air_date.lte'] = today;
      }
    }

    switch (id) {
      case "tmdb.top":
        parameters.with_genres = genre ? findGenreId(genre, genreList) : undefined;
        if (type === "series") {
          parameters.watch_region = language.split("-")[1];
          parameters.with_watch_monetization_types = "flatrate|free|ads|rent|buy";
        }
        break;
      case "tmdb.year":
        const year = genre ? genre : new Date().getFullYear();
        parameters[type === "movie" ? "primary_release_year" : "first_air_date_year"] = year;
        break;
      case "tmdb.language":
        const findGenre = genre ? findLanguageCode(genre, languages) : language.split("-")[0];
        parameters.with_original_language = findGenre;
        break;
      default:
        break;
    }
  }
  return parameters;
}

function findGenreId(genreName, genreList) {
  const genreData = genreList.find(genre => genre.name === genreName);
  return genreData ? genreData.id : undefined;
}

function findLanguageCode(genre, languages) {
  const language = languages.find((lang) => lang.name === genre);
  return language ? language.iso_639_1.split("-")[0] : "";
}

function findProvider(providerId) {
  const provider = CATALOG_TYPES.streaming[providerId];
  if (!provider) throw new Error(`Could not find provider: ${providerId}`);
  return provider;
}

module.exports = { getCatalog };
