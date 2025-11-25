require("dotenv").config();
const { TMDBClient } = require("../utils/tmdbClient");
const Utils = require("../utils/parseProps");
const moviedb = new TMDBClient(process.env.TMDB_API);
const { getEpisodes } = require("./getEpisodes");
const { getLogo, getTvLogo } = require("./getLogo");
const { getImdbRating } = require("./getImdbRating");
const { getCachedAgeRating } = require("./getAgeRating");
const { checkSeasonsAndReport } = require("../utils/checkSeasons");

// Configuration
const CACHE_TTL = 1000 * 60 * 60; // 1 hour
const blacklistLogoUrls = ["https://assets.fanart.tv/fanart/tv/0/hdtvlogo/-60a02798b7eea.png"];

// Cache
const cache = new Map();
const imdbCache = new Map();
async function getCachedImdbRating(imdbId, type) {
  if (!imdbId) return null;
  if (imdbCache.has(imdbId)) return imdbCache.get(imdbId);
  try {
    const rating = await getImdbRating(imdbId, type);
    imdbCache.set(imdbId, rating);
    return rating;
  } catch (err) {
    console.error(`Error fetching IMDb rating for ${imdbId}:`, err.message);
    return null;
  }
}

// Helper functions
const getCacheKey = (
  type,
  language,
  tmdbId,
  rpdbkey,
  enableAgeRating = false,
  showAgeRatingInGenres = true,
  showAgeRatingWithImdbRating = false
) =>
  `${type}-${language}-${tmdbId}-${rpdbkey}-ageRating:${enableAgeRating}-${showAgeRatingInGenres}-${showAgeRatingWithImdbRating}`;

const processLogo = (logo) => {
  if (!logo || typeof logo !== 'string' || blacklistLogoUrls.includes(logo)) return null;
  return logo.replace("http://", "https://");
};


const buildLinks = (
  imdbRating,
  imdbId,
  title,
  type,
  genres,
  credits,
  language,
  castCount,
  ageRating = null,
  showAgeRatingInGenres = true,
  showAgeRatingWithImdbRating = false,
  collObj
) => [
    Utils.parseImdbLink(imdbRating, imdbId, ageRating, showAgeRatingWithImdbRating),
    Utils.parseShareLink(title, imdbId, type),
    ...Utils.parseGenreLink(genres, type, language, imdbId, ageRating, showAgeRatingInGenres),
    ...Utils.parseCreditsLink(credits, castCount),
    ...Utils.parseCollection(collObj) //empty if no collection
  ];

// Helper function to add age rating to genres
const addAgeRatingToGenres = (ageRating, genres, showAgeRatingInGenres = true) => {
  if (!ageRating || !showAgeRatingInGenres) return genres;
  return [ageRating, ...genres];
};

const fetchCollectionData = async (collTMDBId, language, tmdbId) => {
  return await moviedb.collectionInfo({
    id: collTMDBId,
    language
  }).then((res) => {
    if (!res.parts) {
      return null;
    }
    res.parts = res.parts.filter((part) => part.id !== tmdbId); //remove self from collection
    return res;
  });
};

// Movie specific functions
const fetchMovieData = async (tmdbId, language) => {
  return await moviedb.movieInfo({
    id: tmdbId,
    language,
    append_to_response: "videos,credits,external_ids"
  });
};

const buildMovieResponse = async (res, type, language, tmdbId, config = {}) => {
  const rpdbkey = config.rpdbkey;
  const enableAgeRating = config.enableAgeRating === true || config.enableAgeRating === "true";
  const showAgeRatingInGenres = config.showAgeRatingInGenres !== false && config.showAgeRatingInGenres !== "false";
  const showAgeRatingWithImdbRating = config.showAgeRatingWithImdbRating === true || config.showAgeRatingWithImdbRating === "true";

  const rpdbMediaTypes = config.rpdbMediaTypes || null;
  const logo = rpdbMediaTypes?.logo ? await Utils.parseMediaImage(type, tmdbId, null, language, rpdbkey, "logo", rpdbMediaTypes) : getLogo(tmdbId, language, res.original_language).catch(e => {
    console.warn(`Error fetching logo for movie ${tmdbId}:`, e.message);
    return null;
  });
  const [poster, imdbRatingRaw, ageRating, collectionRaw] = await Promise.all([
    Utils.parseMediaImage(type, tmdbId, res.poster_path, language, rpdbkey, "poster", rpdbMediaTypes),
    getCachedImdbRating(res.external_ids?.imdb_id, type),
    enableAgeRating ? getCachedAgeRating(tmdbId, type, language).catch(e => {
      console.warn(`Error fetching age rating for movie ${tmdbId}:`, e.message);
      return null;
    }) : Promise.resolve(null),
    (res.belongs_to_collection && res.belongs_to_collection.id) ? fetchCollectionData(res.belongs_to_collection.id, language, tmdbId).catch((e) => {
      console.warn(`Error fetching collection data for movie ${tmdbId} and collection ${res.belongs_to_collection.id}:`, e.message);
      return null;
    }) : null //should be the same as Promise.resolve(null)
  ]);

  const imdbRating = imdbRatingRaw || res.vote_average?.toFixed(1) || "N/A";
  const castCount = config.castCount
  const returnImdbId = config.returnImdbId === true || config.returnImdbId === "true";
  const hideInCinemaTag = config.hideInCinemaTag === true || config.hideInCinemaTag === "true";

  const parsedGenres = Utils.parseGenres(res.genres);
  const resolvedAgeRating = enableAgeRating ? ageRating : null;

  const response = {
    imdb_id: res.imdb_id,
    country: Utils.parseCoutry(res.production_countries),
    description: res.overview,
    director: Utils.parseDirector(res.credits),
    genre: addAgeRatingToGenres(resolvedAgeRating, parsedGenres, showAgeRatingInGenres),
    imdbRating,
    name: res.title,
    released: new Date(res.release_date),
    slug: Utils.parseSlug(type, res.title, res.imdb_id),
    type,
    writer: Utils.parseWriter(res.credits),
    year: res.release_date ? res.release_date.substr(0, 4) : "",
    trailers: Utils.parseTrailers(res.videos),
    background: await Utils.parseMediaImage(type, tmdbId, res.backdrop_path, language, rpdbkey, "backdrop", rpdbMediaTypes),
    poster,
    runtime: Utils.parseRunTime(res.runtime),
    id: returnImdbId ? res.imdb_id : `tmdb:${tmdbId}`,
    genres: addAgeRatingToGenres(resolvedAgeRating, parsedGenres, showAgeRatingInGenres),
    ageRating: resolvedAgeRating,
    releaseInfo: res.release_date ? res.release_date.substr(0, 4) : "",
    trailerStreams: Utils.parseTrailerStream(res.videos),
    links: buildLinks(
      imdbRating,
      res.imdb_id,
      res.title,
      type,
      res.genres,
      res.credits,
      language,
      castCount,
      resolvedAgeRating,
      showAgeRatingInGenres,
      showAgeRatingWithImdbRating,
      collectionRaw
    ),
    behaviorHints: {
      defaultVideoId: res.imdb_id ? res.imdb_id : `tmdb:${res.id}`,
      hasScheduledVideos: false
    },
    logo: processLogo(logo),
    app_extras: {
      cast: Utils.parseCast(res.credits, castCount)
    }
  };
  if (hideInCinemaTag) delete response.imdb_id;
  return response;
};

// TV show specific functions
const fetchTvData = async (tmdbId, language) => {
  return await moviedb.tvInfo({
    id: tmdbId,
    language,
    append_to_response: "videos,credits,external_ids"
  });
};

const buildTvResponse = async (res, type, language, tmdbId, config = {}) => {
  const rpdbkey = config.rpdbkey;
  const runtime = res.episode_run_time?.[0] ?? res.last_episode_to_air?.runtime ?? res.next_episode_to_air?.runtime ?? null;
  const enableAgeRating = config.enableAgeRating === true || config.enableAgeRating === "true";
  const showAgeRatingInGenres = config.showAgeRatingInGenres !== false && config.showAgeRatingInGenres !== "false";
  const showAgeRatingWithImdbRating = config.showAgeRatingWithImdbRating === true || config.showAgeRatingWithImdbRating === "true";

  const rpdbMediaTypes = config.rpdbMediaTypes || null;
  const logo = rpdbMediaTypes?.logo ? await Utils.parseMediaImage(type, tmdbId, null, language, rpdbkey, "logo", rpdbMediaTypes) : getTvLogo(res.external_ids?.tvdb_id, res.id, language, res.original_language).catch(e => {
    console.warn(`Error fetching logo for series ${tmdbId}:`, e.message);
    return null;
  });
  const [poster, imdbRatingRaw, episodes, ageRating, collectionRaw] = await Promise.all([
    Utils.parseMediaImage(type, tmdbId, res.poster_path, language, rpdbkey, "poster", rpdbMediaTypes),
    getCachedImdbRating(res.external_ids?.imdb_id, type),
    getEpisodes(language, tmdbId, res.external_ids?.imdb_id, res.seasons, {
      hideEpisodeThumbnails: config.hideEpisodeThumbnails
    }).catch(e => {
      console.warn(`Error fetching episodes for series ${tmdbId}:`, e.message);
      return [];
    }),
    enableAgeRating ? getCachedAgeRating(tmdbId, type, language).catch(e => {
      console.warn(`Error fetching age rating for series ${tmdbId}:`, e.message);
      return null;
    }) : Promise.resolve(null),
    (res.belongs_to_collection && res.belongs_to_collection.id) ? fetchCollectionData(res.belongs_to_collection.id, language, tmdbId).catch((e) => {
      console.warn(`Error fetching collection data for movie ${tmdbId} and collection ${res.belongs_to_collection.id}:`, e.message);
      return null;
    }) : null //should be the same as Promise.resolve(null)
  ]);

  const imdbRating = imdbRatingRaw || res.vote_average?.toFixed(1) || "N/A";
  const castCount = config.castCount
  const returnImdbId = config.returnImdbId === true || config.returnImdbId === "true";
  const hideInCinemaTag = config.hideInCinemaTag === true || config.hideInCinemaTag === "true";
  const parsedGenres = Utils.parseGenres(res.genres);
  const resolvedAgeRating = enableAgeRating ? ageRating : null;

  const response = {
    country: Utils.parseCoutry(res.production_countries),
    description: res.overview,
    genre: addAgeRatingToGenres(resolvedAgeRating, parsedGenres, showAgeRatingInGenres),
    imdbRating,
    imdb_id: res.external_ids.imdb_id,
    name: res.name,
    poster,
    released: new Date(res.first_air_date),
    runtime: Utils.parseRunTime(runtime),
    status: res.status,
    type,
    writer: Utils.parseCreatedBy(res.created_by),
    year: Utils.parseYear(res.status, res.first_air_date, res.last_air_date),
    background: await Utils.parseMediaImage(type, tmdbId, res.backdrop_path, language, rpdbkey, "backdrop", rpdbMediaTypes),
    slug: Utils.parseSlug(type, res.name, res.external_ids.imdb_id),
    id: returnImdbId ? res.imdb_id : `tmdb:${tmdbId}`,
    genres: addAgeRatingToGenres(resolvedAgeRating, parsedGenres, showAgeRatingInGenres),
    ageRating: resolvedAgeRating,
    releaseInfo: Utils.parseYear(res.status, res.first_air_date, res.last_air_date),
    videos: episodes || [],
    links: buildLinks(
      imdbRating,
      res.external_ids.imdb_id,
      res.name,
      type,
      res.genres,
      res.credits,
      language,
      castCount,
      resolvedAgeRating,
      showAgeRatingInGenres,
      showAgeRatingWithImdbRating,
      collectionRaw
    ),
    trailers: Utils.parseTrailers(res.videos),
    trailerStreams: Utils.parseTrailerStream(res.videos),
    behaviorHints: {
      defaultVideoId: null,
      hasScheduledVideos: true
    },
    logo: processLogo(logo),
    app_extras: {
      cast: Utils.parseCast(res.credits, castCount)
    }
  };
  if (hideInCinemaTag) delete response.imdb_id;

  // Season check (without opening issue)
  if (response.imdb_id && response.videos && response.name) {
    // Call the check, but comment out the Issue part inside the function
    checkSeasonsAndReport(
      tmdbId,
      response.imdb_id,
      { meta: response },
      response.name
    );
  }

  return response;
};

// Main function
async function getMeta(type, language, tmdbId, config = {}) {
  const enableAgeRating = config.enableAgeRating === true || config.enableAgeRating === "true";
  const showAgeRatingInGenres = config.showAgeRatingInGenres !== false && config.showAgeRatingInGenres !== "false";
  const showAgeRatingWithImdbRating = config.showAgeRatingWithImdbRating === true || config.showAgeRatingWithImdbRating === "true";
  const rpdbkey = config.rpdbkey;

  const cacheKey = getCacheKey(
    type,
    language,
    tmdbId,
    rpdbkey,
    enableAgeRating,
    showAgeRatingInGenres,
    showAgeRatingWithImdbRating
  );
  const cachedData = cache.get(cacheKey);

  if (cachedData && (Date.now() - cachedData.timestamp) < CACHE_TTL) {
    return Promise.resolve({ meta: cachedData.data });
  }

  try {
    const meta = await (type === "movie" ?
      fetchMovieData(tmdbId, language).then(res => buildMovieResponse(res, type, language, tmdbId, rpdbkey, {
        ...config,
        enableAgeRating,
        showAgeRatingInGenres,
        showAgeRatingWithImdbRating
      })) :
      fetchTvData(tmdbId, language).then(res => buildTvResponse(res, type, language, tmdbId, rpdbkey, {
        ...config,
        enableAgeRating,
        showAgeRatingInGenres,
        showAgeRatingWithImdbRating
      }))
    );

    cache.set(cacheKey, { data: meta, timestamp: Date.now() });
    return Promise.resolve({ meta });
  } catch (error) {
    console.error(`Error in getMeta: ${error.message}`);
    throw error;
  }
}

module.exports = { getMeta };