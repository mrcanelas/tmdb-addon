require("dotenv").config();
const { TMDBClient } = require("../utils/tmdbClient");
const moviedb = new TMDBClient(process.env.TMDB_API);
const { getGenreList } = require("./getGenreList");
const { getLanguages } = require("./getLanguages");
const { parseMedia } = require("../utils/parseProps");
const { fetchMDBListItems, parseMDBListItems } = require("../utils/mdbList");
const { getMeta } = require("./getMeta");
const CATALOG_TYPES = require("../static/catalog-types.json");

/**
 * Check if a movie has been released in a specific region
 * @param {number} movieId - TMDB movie ID
 * @param {string} region - ISO 3166-1 country code (e.g., 'IT')
 * @returns {Promise<boolean>} - true if released in region, false otherwise
 */
async function isMovieReleasedInRegion(movieId, region) {
  try {
    const today = new Date().toISOString().split('T')[0];
    console.log(`[REGION FILTER] Checking movie ${movieId} for region ${region}`);

    const releaseDates = await moviedb.movieReleaseDates({ id: movieId });

    // No release data available - EXCLUDE (strict mode)
    if (!releaseDates || !releaseDates.results || releaseDates.results.length === 0) {
      console.log(`[REGION FILTER] Movie ${movieId}: NO release data at all -> EXCLUDED`);
      return false;
    }

    console.log(`[REGION FILTER] Movie ${movieId}: Found releases in ${releaseDates.results.map(r => r.iso_3166_1).join(', ')}`);

    const regionRelease = releaseDates.results.find(r => r.iso_3166_1 === region);

    if (!regionRelease || !regionRelease.release_dates) {
      console.log(`[REGION FILTER] Movie ${movieId}: NO release in ${region} -> EXCLUDED`);
      return false; // No release in this region
    }

    console.log(`[REGION FILTER] Movie ${movieId}: Found ${regionRelease.release_dates.length} release dates in ${region}`);

    const validReleaseTypes = [2, 3, 4, 5, 6]; // Exclude only Premiere
    const hasValidRelease = regionRelease.release_dates.some(rd => {
      const releaseDate = rd.release_date ? rd.release_date.split('T')[0] : null;
      if (!releaseDate) return false;
      const isValid = releaseDate <= today && validReleaseTypes.includes(rd.type);
      console.log(`[REGION FILTER] Movie ${movieId}: Date ${releaseDate}, Type ${rd.type}, Valid: ${isValid}`);
      return isValid;
    });

    console.log(`[REGION FILTER] Movie ${movieId}: Final result -> ${hasValidRelease ? 'INCLUDED' : 'EXCLUDED'}`);
    return hasValidRelease;
  } catch (error) {
    console.error(`[REGION FILTER] Movie ${movieId}: ERROR - ${error.message} -> EXCLUDED`);
    // On error, EXCLUDE to be strict (might miss some valid movies but ensures accuracy)
    return false;
  }
}

async function getCatalog(type, language, page, id, genre, config) {
  const mdblistKey = config.mdblistkey

  if (id.startsWith("mdblist.")) {
    const listId = id.split(".")[1];
    const results = await fetchMDBListItems(listId, mdblistKey, language, page);
    const parseResults = await parseMDBListItems(results, type, genre, language, config);

    return parseResults
  }

  const genreList = await getGenreList(language, type);
  const parameters = await buildParameters(type, language, page, id, genre, genreList, config);

  const fetchFunction = type === "movie" ? moviedb.discoverMovie.bind(moviedb) : moviedb.discoverTv.bind(moviedb);

  return fetchFunction(parameters)
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

      // Debug: Log config values
      console.log(`[REGION FILTER DEBUG] type=${type}, strictRegionFilter=${config.strictRegionFilter}, language=${language}`);

      // Apply strict region filtering for movies - check actual regional release dates
      if (type === "movie" && (config.strictRegionFilter === "true" || config.strictRegionFilter === true) && language && language.split('-')[1]) {
        const region = language.split('-')[1];
        console.log(`[REGION FILTER] ENABLED - Filtering ${metas.length} movies for region ${region}`);

        const releaseChecks = await Promise.all(
          metas.map(async (meta) => {
            const tmdbId = meta.id ? parseInt(meta.id.replace('tmdb:', ''), 10) : null;
            if (!tmdbId) return { meta, released: true };

            const released = await isMovieReleasedInRegion(tmdbId, region);
            return { meta, released };
          })
        );

        const beforeCount = metas.length;
        metas = releaseChecks
          .filter(check => check.released)
          .map(check => check.meta);
        console.log(`[REGION FILTER] Filtered: ${beforeCount} -> ${metas.length} movies`);
      } else {
        console.log(`[REGION FILTER] DISABLED - Not filtering`);
      }

      return { metas };
    })
    .catch(console.error);
}

async function buildParameters(type, language, page, id, genre, genreList, config) {
  const languages = await getLanguages();
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
        parameters.with_release_type = "3|4";
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
        parameters.with_release_type = "3|4";
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
