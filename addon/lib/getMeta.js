require("dotenv").config();
const { getTmdbClient } = require("../utils/getTmdbClient");
const Utils = require("../utils/parseProps");
const { getEpisodes } = require("./getEpisodes");
const { getLogo, getTvLogo } = require("./getLogo");
const { getImdbRating } = require("./getImdbRating");
const { getCachedAgeRating } = require("./getAgeRating");
const { checkSeasonsAndReport } = require("../utils/checkSeasons");

const CACHE_TTL = 1000 * 60 * 60; // 1 hour
const blacklistLogoUrls = ["https://assets.fanart.tv/fanart/tv/0/hdtvlogo/-60a02798b7eea.png"];
const cache = new Map();
const imdbCache = new Map();

const extractAgeRating = (res, type, language) => {
    const countryCode = language.split('-')[1]?.toUpperCase();
    if (type === 'movie' && res.release_dates && res.release_dates.results) {
        let countryRelease = res.release_dates.results.find(r => r.iso_3166_1 === countryCode);
        if (!countryRelease && countryCode !== 'US') {
            countryRelease = res.release_dates.results.find(r => r.iso_3166_1 === 'US');
        }
        if (countryRelease && Array.isArray(countryRelease.release_dates)) {
            let ratingObj = countryRelease.release_dates.find(d => d.certification && d.type === 3);
            if (!ratingObj) {
                ratingObj = countryRelease.release_dates.find(d => d.certification);
            }
            return ratingObj ? ratingObj.certification : null;
        }
    } else if (type === 'series' && res.content_ratings && res.content_ratings.results) {
        let ratingObj = res.content_ratings.results.find(r => r.iso_3166_1 === countryCode);
        if (!ratingObj && countryCode !== 'US') {
            ratingObj = res.content_ratings.results.find(r => r.iso_3166_1 === 'US');
        }
        return ratingObj ? ratingObj.rating : null;
    }
    return null;
}

const normalizeConfig = (config) => {
    const {
        rpdbkey,
        rpdbMediaTypes = null,
        castCount,
        hideEpisodeThumbnails,
    } = config;

    const enableAgeRating = config.enableAgeRating === true || config.enableAgeRating === "true";
    const showAgeRatingInGenres = config.showAgeRatingInGenres !== false && config.showAgeRatingInGenres !== "false";
    const showAgeRatingWithImdbRating = config.showAgeRatingWithImdbRating === true || config.showAgeRatingWithImdbRating === "true";
    const returnImdbId = config.returnImdbId === true || config.returnImdbId === "true";
    const hideInCinemaTag = config.hideInCinemaTag === true || config.hideInCinemaTag === "true";

    return {
        rpdbkey,
        rpdbMediaTypes,
        castCount,
        hideEpisodeThumbnails,
        enableAgeRating,
        showAgeRatingInGenres,
        showAgeRatingWithImdbRating,
        returnImdbId,
        hideInCinemaTag,
    };
};

const getCacheKey = (
    type,
    language,
    tmdbId,
    config
) => {
    const { enableAgeRating, showAgeRatingInGenres, showAgeRatingWithImdbRating, rpdbkey } = normalizeConfig(config);
    return `${type}-${language}-${tmdbId}-${rpdbkey}-ageRating:${enableAgeRating}-${showAgeRatingInGenres}-${showAgeRatingWithImdbRating}`;
}

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

const fetchCollectionData = async (moviedb, collTMDBId, language, tmdbId) => {
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
const fetchMovieData = async (moviedb, tmdbId, language) => {
    return await moviedb.movieInfo({
        id: tmdbId,
        language,
        append_to_response: "videos,credits,external_ids,release_dates"
    });
};

const buildMovieResponse = async (res, type, language, tmdbId, config = {}) => {
    const {
        rpdbkey,
        rpdbMediaTypes,
        castCount,
        enableAgeRating,
        showAgeRatingInGenres,
        showAgeRatingWithImdbRating,
        returnImdbId,
        hideInCinemaTag
    } = normalizeConfig(config);

    const logoFetcher = rpdbMediaTypes?.logo
        ? Utils.parseMediaImage(type, tmdbId, null, language, rpdbkey, "logo", rpdbMediaTypes)
        : getLogo(tmdbId, language, res.original_language, config);

    const logo = await logoFetcher.catch(e => {
        console.warn(`Error fetching logo for movie ${tmdbId}:`, e.message);
        return null;
    });

    const moviedb = getTmdbClient(config);
    const [poster, imdbRatingRaw, collectionRaw] = await Promise.all([
        Utils.parseMediaImage(type, tmdbId, res.poster_path, language, rpdbkey, "poster", rpdbMediaTypes),
        getCachedImdbRating(res.external_ids?.imdb_id, type),
        (res.belongs_to_collection && res.belongs_to_collection.id)
            ? fetchCollectionData(moviedb, res.belongs_to_collection.id, language, tmdbId).catch((e) => {
                console.warn(`Error fetching collection data for movie ${tmdbId} and collection ${res.belongs_to_collection.id}:`, e.message);
                return null;
            })
            : null
    ]);

    const imdbRating = imdbRatingRaw || res.vote_average?.toFixed(1) || "N/A";
    const parsedGenres = Utils.parseGenres(res.genres);

    let resolvedAgeRating = null;
    if (enableAgeRating) {
        resolvedAgeRating = extractAgeRating(res, type, language);
    }

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
const fetchTvData = async (moviedb, tmdbId, language) => {
    return await moviedb.tvInfo({
        id: tmdbId,
        language,
        append_to_response: "videos,credits,external_ids,content_ratings"
    });
};

const buildTvResponse = async (res, type, language, tmdbId, config = {}) => {
    const {
        rpdbkey,
        rpdbMediaTypes,
        castCount,
        enableAgeRating,
        showAgeRatingInGenres,
        showAgeRatingWithImdbRating,
        returnImdbId,
        hideInCinemaTag,
        hideEpisodeThumbnails,
    } = normalizeConfig(config);

    const runtime = res.episode_run_time?.[0] ?? res.last_episode_to_air?.runtime ?? res.next_episode_to_air?.runtime ?? null;

    const logoFetcher = rpdbMediaTypes?.logo
        ? Utils.parseMediaImage(type, tmdbId, null, language, rpdbkey, "logo", rpdbMediaTypes)
        : getTvLogo(res.external_ids?.tvdb_id, res.id, language, res.original_language, config);

    const logo = await logoFetcher.catch(e => {
        console.warn(`Error fetching logo for series ${tmdbId}:`, e.message);
        return null;
    });

    const moviedb = getTmdbClient(config);
    const [poster, imdbRatingRaw, episodes, collectionRaw] = await Promise.all([
        Utils.parseMediaImage(type, tmdbId, res.poster_path, language, rpdbkey, "poster", rpdbMediaTypes),
        getCachedImdbRating(res.external_ids?.imdb_id, type),
        getEpisodes(language, tmdbId, res.external_ids?.imdb_id, res.seasons, config).catch(e => {
            console.warn(`Error fetching episodes for series ${tmdbId}:`, e.message);
            return [];
        }),
        (res.belongs_to_collection && res.belongs_to_collection.id)
            ? fetchCollectionData(moviedb, res.belongs_to_collection.id, language, tmdbId).catch((e) => {
                console.warn(`Error fetching collection data for movie ${tmdbId} and collection ${res.belongs_to_collection.id}:`, e.message);
                return null;
            })
            : null
    ]);

    const imdbRating = imdbRatingRaw || res.vote_average?.toFixed(1) || "N/A";
    const parsedGenres = Utils.parseGenres(res.genres);

    let resolvedAgeRating = null;
    if (enableAgeRating) {
        resolvedAgeRating = extractAgeRating(res, type, language);
    }

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
        id: returnImdbId ? res.external_ids.imdb_id : `tmdb:${tmdbId}`,
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
    const cacheKey = getCacheKey(type, language, tmdbId, config);
    const cachedData = cache.get(cacheKey);

    if (cachedData && (Date.now() - cachedData.timestamp) < CACHE_TTL) {
        return Promise.resolve({ meta: cachedData.data });
    }

    if (tmdbId === "no-content" || tmdbId === "0") {
        const host = process.env.HOST_NAME ? process.env.HOST_NAME.replace(/\/$/, '') : '';
        const posterUrl = host + "/no-content.png?v=" + Date.now();
        return Promise.resolve({
            meta: {
                id: "tmdb:no-content",
                type: type,
                name: "No Content Available",
                poster: posterUrl,
                description: "No content found for the selected filter.",
                genres: ["No Results"],
                logo: posterUrl,
                background: posterUrl
            }
        });
    }

    try {
        const moviedb = getTmdbClient(config);
        const meta = await (type === "movie" ?
            fetchMovieData(moviedb, tmdbId, language).then(res => buildMovieResponse(res, type, language, tmdbId, config)) :
            fetchTvData(moviedb, tmdbId, language).then(res => buildTvResponse(res, type, language, tmdbId, config))
        );

        cache.set(cacheKey, { data: meta, timestamp: Date.now() });
        return Promise.resolve({ meta });
    } catch (error) {
        console.error(`Error in getMeta: ${error.message}`);
        throw error;
    }
}

module.exports = { getMeta };