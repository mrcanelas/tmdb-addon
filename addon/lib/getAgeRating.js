require("dotenv").config();
const { getTmdbClient } = require("../utils/getTmdbClient");
const Utils = require("../utils/parseProps");

// Cache for age ratings
const ageRatingCache = new Map();
const CACHE_TTL = 1000 * 60 * 60; // 1 hour

/**
 * Get age rating for a movie from TMDB
 */
async function getMovieAgeRating(tmdbId, language) {
    try {
        const moviedb = getTmdbClient();
        const releaseDates = await moviedb.movieReleaseDates({ id: tmdbId });
        const userRegion = language.split("-")[1] || "US";

        // Try user's region first
        let ageRating = Utils.parseCertification(releaseDates, language);

        // If no rating found for user's region, fallback to US
        if (!ageRating && userRegion !== "US") {
            ageRating = Utils.parseCertification(releaseDates, "en-US");
        }

        return ageRating || null;
    } catch (error) {
        console.error(`Error fetching age rating for movie ${tmdbId}:`, error.message);
        return null;
    }
}

/**
 * Get age rating for a TV show from TMDB
 */
async function getTvAgeRating(tmdbId, language) {
    try {
        const moviedb = getTmdbClient();
        const contentRatings = await moviedb.tvContentRatings({ id: tmdbId });
        const userRegion = language.split("-")[1] || "US";

        // Find rating for user's region
        let ageRating = null;
        const userRegionRating = contentRatings.results.find(
            rating => rating.iso_3166_1 === userRegion
        );

        if (userRegionRating && userRegionRating.rating) {
            ageRating = userRegionRating.rating;
        } else {
            // Fallback to US rating
            const usRating = contentRatings.results.find(
                rating => rating.iso_3166_1 === "US"
            );
            if (usRating && usRating.rating) {
                ageRating = usRating.rating;
            }
        }

        return ageRating || null;
    } catch (error) {
        console.error(`Error fetching age rating for TV show ${tmdbId}:`, error.message);
        return null;
    }
}

/**
 * Get cached age rating
 */
async function getCachedAgeRating(tmdbId, type, language) {
    if (!tmdbId) return null;

    const cacheKey = `${type}-${tmdbId}-${language}`;
    const cached = ageRatingCache.get(cacheKey);

    if (cached && (Date.now() - cached.timestamp) < CACHE_TTL) {
        return cached.rating;
    }

    try {
        const rating = type === "movie"
            ? await getMovieAgeRating(tmdbId, language)
            : await getTvAgeRating(tmdbId, language);

        ageRatingCache.set(cacheKey, { rating, timestamp: Date.now() });
        return rating;
    } catch (err) {
        console.error(`Error fetching age rating for ${type} ${tmdbId}:`, err.message);
        return null;
    }
}

module.exports = { getCachedAgeRating };
