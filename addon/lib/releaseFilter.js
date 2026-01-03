/**
 * Centralized release date checking with Redis caching
 * This module caches TMDB release dates API calls to improve performance
 */
require("dotenv").config();
const { TMDBClient } = require("../utils/tmdbClient");
const moviedb = new TMDBClient(process.env.TMDB_API);
const { cache } = require("./getCache");

const RELEASE_KEY_PREFIX = 'tmdb-addon|release';
const RELEASE_TTL = 6 * 60 * 60; // 6 hours in seconds

/**
 * Get release dates for a movie (with Redis caching)
 * @param {number} movieId - TMDB movie ID
 * @returns {Promise<Object|null>} - Release dates data or null
 */
async function getReleaseDates(movieId) {
    const cacheKey = `${RELEASE_KEY_PREFIX}:${movieId}`;

    // Try to get from cache first
    if (cache) {
        try {
            const cached = await cache.get(cacheKey);
            if (cached) {
                return cached;
            }
        } catch (error) {
            console.error(`Cache get error for ${cacheKey}:`, error.message);
        }
    }

    // Fetch from API
    try {
        const releaseDates = await moviedb.movieReleaseDates({ id: movieId });

        // Store in cache
        if (cache && releaseDates) {
            try {
                await cache.set(cacheKey, releaseDates, { ttl: RELEASE_TTL });
            } catch (error) {
                console.error(`Cache set error for ${cacheKey}:`, error.message);
            }
        }

        return releaseDates;
    } catch (error) {
        console.error(`Error fetching release dates for movie ${movieId}:`, error.message);
        return null;
    }
}

/**
 * Check if a movie has been released in a specific region (Digital/Physical/TV only)
 * @param {number} movieId - TMDB movie ID
 * @param {string} region - ISO 3166-1 country code (e.g., 'IT')
 * @returns {Promise<boolean>} - true if released in region, false otherwise
 */
async function isMovieReleasedInRegion(movieId, region) {
    try {
        const today = new Date().toISOString().split('T')[0];
        const releaseDates = await getReleaseDates(movieId);

        if (!releaseDates || !releaseDates.results) return true;

        const regionRelease = releaseDates.results.find(r => r.iso_3166_1 === region);

        if (!regionRelease || !regionRelease.release_dates) {
            return false; // No release in this region
        }

        const validReleaseTypes = [3, 4, 5, 6]; // Theatrical, Digital, Physical, TV - no Premiere (1)
        const hasValidRelease = regionRelease.release_dates.some(rd => {
            const releaseDate = rd.release_date ? rd.release_date.split('T')[0] : null;
            if (!releaseDate) return false;
            return releaseDate <= today && validReleaseTypes.includes(rd.type);
        });

        return hasValidRelease;
    } catch (error) {
        console.error(`Error checking release dates for movie ${movieId}:`, error.message);
        return true;
    }
}

/**
 * Check if a movie has been released digitally (globally, any region)
 * @param {number} movieId - TMDB movie ID
 * @returns {Promise<boolean>} - true if released digitally anywhere, false otherwise
 */
async function isMovieReleasedDigitally(movieId) {
    try {
        const today = new Date().toISOString().split('T')[0];
        const releaseDates = await getReleaseDates(movieId);

        if (!releaseDates || !releaseDates.results) return true;

        const digitalReleaseTypes = [4, 5, 6]; // Digital, Physical, TV

        for (const regionData of releaseDates.results) {
            if (!regionData.release_dates) continue;

            const hasDigitalRelease = regionData.release_dates.some(rd => {
                const releaseDate = rd.release_date ? rd.release_date.split('T')[0] : null;
                if (!releaseDate) return false;
                return releaseDate <= today && digitalReleaseTypes.includes(rd.type);
            });

            if (hasDigitalRelease) return true;
        }

        return false;
    } catch (error) {
        console.error(`Error checking digital release for movie ${movieId}:`, error.message);
        return true;
    }
}

module.exports = { isMovieReleasedInRegion, isMovieReleasedDigitally };
