require("dotenv").config();
const { TMDBClient } = require("../utils/tmdbClient");
const moviedb = new TMDBClient(process.env.TMDB_API);
const { getMeta } = require("./getMeta");

/**
 * Check if a movie has been released in a specific region
 * @param {number} movieId - TMDB movie ID
 * @param {string} region - ISO 3166-1 country code (e.g., 'IT')
 * @returns {Promise<boolean>} - true if released in region, false otherwise
 */
async function isMovieReleasedInRegion(movieId, region) {
  try {
    const today = new Date().toISOString().split('T')[0];
    const releaseDates = await moviedb.movieReleaseDates({ id: movieId });

    if (!releaseDates || !releaseDates.results) return true;

    const regionRelease = releaseDates.results.find(r => r.iso_3166_1 === region);

    if (!regionRelease || !regionRelease.release_dates) {
      return false; // No release in this region
    }

    const validReleaseTypes = [4, 5, 6]; // Only Digital, Physical, TV - no Theatrical (3) or Premiere (1)
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

      return { metas };
    })
    .catch(console.error);
}

module.exports = { getTrending };
