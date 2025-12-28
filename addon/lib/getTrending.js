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

    // No release data available - EXCLUDE (strict mode)
    if (!releaseDates || !releaseDates.results || releaseDates.results.length === 0) {
      return false;
    }

    const regionRelease = releaseDates.results.find(r => r.iso_3166_1 === region);

    if (!regionRelease || !regionRelease.release_dates) {
      return false; // No release in this region
    }

    const validReleaseTypes = [2, 3, 4, 5, 6]; // Exclude only Premiere
    const hasValidRelease = regionRelease.release_dates.some(rd => {
      const releaseDate = rd.release_date ? rd.release_date.split('T')[0] : null;
      if (!releaseDate) return false;
      return releaseDate <= today && validReleaseTypes.includes(rd.type);
    });

    return hasValidRelease;
  } catch (error) {
    console.error(`Error checking release dates for movie ${movieId}:`, error.message);
    // On error, EXCLUDE to be strict
    return false;
  }
}

async function getTrending(type, language, page, genre, config) {
  // Check if we need to filter by specific region (strict mode)
  // TMDB Trending API doesn't support 'region', so we fallback to discover
  // effectively showing "Popular" content in that region as a proxy for "Trending"
  // ONLY if strict region filtering is enabled
  if ((config.strictRegionFilter === "true" || config.strictRegionFilter === true) && language && language.split('-')[1]) {
    const region = language.split('-')[1];
    const fetchFunction = type === "movie" ? moviedb.discoverMovie.bind(moviedb) : moviedb.discoverTv.bind(moviedb);

    const today = new Date().toISOString().split('T')[0];
    const discoverParams = {
      language,
      page,
      region: region,
      sort_by: 'popularity.desc',
      'vote_count.gte': 10,
    };

    if (type === "movie") {
      discoverParams['release_date.lte'] = today;
      discoverParams.with_release_type = "3|4";
    } else {
      discoverParams['first_air_date.lte'] = today;
    }

    return await fetchFunction(discoverParams)
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

        // Apply strict region filtering for movies - check actual regional release dates
        if (type === "movie") {
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

  const media_type = type === "series" ? "tv" : type;
  const parameters = {
    media_type,
    time_window: genre ? genre.toLowerCase() : "day",
    language,
    page,
  };

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

      const metas = (await Promise.all(metaPromises)).filter(Boolean);
      return { metas };
    })
    .catch(console.error);
}

module.exports = { getTrending };
