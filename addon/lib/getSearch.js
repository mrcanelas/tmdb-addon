require("dotenv").config();
const { TMDBClient } = require("../utils/tmdbClient");
const moviedb = new TMDBClient(process.env.TMDB_API);
const geminiService = require("../utils/gemini-service");
const { transliterate } = require("transliteration");
const { parseMedia } = require("../utils/parseProps");
const { getGenreList } = require("./getGenreList");

function isNonLatin(text) {
  return /[^\u0000-\u007F]/.test(text);
}

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

    if (!releaseDates || !releaseDates.results) return true; // Can't determine, include it

    // Find releases for the specified region
    const regionRelease = releaseDates.results.find(r => r.iso_3166_1 === region);

    if (!regionRelease || !regionRelease.release_dates) {
      // No release in this region - exclude
      return false;
    }

    // Check if any release date in this region is <= today
    // Release types: 1=Premiere, 2=Theatrical (limited), 3=Theatrical, 4=Digital, 5=Physical, 6=TV
    const validReleaseTypes = [4, 5, 6]; // Only Digital, Physical, TV - no Theatrical (3) or Premiere (1)
    const hasValidRelease = regionRelease.release_dates.some(rd => {
      const releaseDate = rd.release_date ? rd.release_date.split('T')[0] : null;
      if (!releaseDate) return false;
      return releaseDate <= today && validReleaseTypes.includes(rd.type);
    });

    return hasValidRelease;
  } catch (error) {
    console.error(`Error checking release dates for movie ${movieId}:`, error.message);
    return true; // On error, include it
  }
}

/**
 * Check if a TV show has aired in a region (based on first_air_date)
 * TV shows don't have region-specific release dates in the same way
 * @param {string} firstAirDate - First air date in YYYY-MM-DD format
 * @returns {boolean} - true if aired, false otherwise
 */
function isTvShowAired(firstAirDate) {
  if (!firstAirDate) return true;
  const today = new Date().toISOString().split('T')[0];
  return firstAirDate <= today;
}

async function getSearch(id, type, language, query, config) {
  let searchQuery = query;
  if (isNonLatin(searchQuery)) {
    searchQuery = transliterate(searchQuery);
  }

  const isAISearch = id === "tmdb.aisearch";
  let searchResults = [];

  if (isAISearch && config.geminikey) {
    try {
      await geminiService.initialize(config.geminikey);

      const titles = await geminiService.searchWithAI(query, type);

      const genreList = await getGenreList(language, type);

      const searchPromises = titles.map(async (title) => {
        try {
          const parameters = {
            query: title,
            language,
            include_adult: config.includeAdult
          };

          if (type === "movie") {
            const res = await moviedb.searchMovie(parameters);
            if (res.results && res.results.length > 0) {
              return parseMedia(res.results[0], 'movie', genreList);
            }
          } else {
            const res = await moviedb.searchTv(parameters);
            if (res.results && res.results.length > 0) {
              return parseMedia(res.results[0], 'tv', genreList);
            }
          }
          return null;
        } catch (error) {
          console.error(`Error fetching details for title "${title}":`, error);
          return null;
        }
      });

      const results = await Promise.all(searchPromises);
      searchResults = results.filter(result => result !== null);

    } catch (error) {
      console.error('Error processing AI search:', error);
    }
  }

  if (searchResults.length === 0) {
    const genreList = await getGenreList(language, type);

    const parameters = {
      query: query,
      language,
      include_adult: config.includeAdult
    };

    if ((config.strictRegionFilter === "true" || config.strictRegionFilter === true) && language && language.split('-')[1]) {
      parameters.region = language.split('-')[1];
    }

    if (config.ageRating) {
      parameters.certification_country = "US";
      switch (config.ageRating) {
        case "G":
          parameters.certification = type === "movie" ? "G" : "TV-G";
          break;
        case "PG":
          parameters.certification = type === "movie" ? ["G", "PG"].join("|") : ["TV-G", "TV-PG"].join("|");
          break;
        case "PG-13":
          parameters.certification = type === "movie" ? ["G", "PG", "PG-13"].join("|") : ["TV-G", "TV-PG", "TV-14"].join("|");
          break;
        case "R":
          parameters.certification = type === "movie" ? ["G", "PG", "PG-13", "R"].join("|") : ["TV-G", "TV-PG", "TV-14", "TV-MA"].join("|");
          break;
      }
    }

    if (type === "movie") {
      await moviedb
        .searchMovie(parameters)
        .then((res) => {
          let results = res.results;
          // Filter out unreleased content when strict mode is on
          if ((config.strictRegionFilter === "true" || config.strictRegionFilter === true)) {
            const today = new Date().toISOString().split('T')[0];
            results = results.filter(el => {
              if (!el.release_date) return true; // No date, include it
              return el.release_date <= today;
            });
          }
          results.map((el) => { searchResults.push(parseMedia(el, 'movie', genreList)); });
        })
        .catch(console.error);

      if (searchResults.length === 0) {
        await moviedb
          .searchMovie({ query: searchQuery, language, include_adult: config.includeAdult })
          .then((res) => {
            res.results.map((el) => { searchResults.push(parseMedia(el, 'movie', genreList)); });
          })
          .catch(console.error);
      }

      await moviedb.searchPerson({ query: query, language }).then(async (res) => {
        if (res.results[0]) {
          await moviedb
            .personMovieCredits({ id: res.results[0].id, language })
            .then((credits) => {
              credits.cast.map((el) => {
                if (!searchResults.find((meta) => meta.id === `tmdb:${el.id}`)) {
                  searchResults.push(parseMedia(el, 'movie', genreList));
                }
              });
              credits.crew.map((el) => {
                if (el.job === "Director" || el.job === "Writer") {
                  if (!searchResults.find((meta) => meta.id === `tmdb:${el.id}`)) {
                    searchResults.push(parseMedia(el, 'movie', genreList));
                  }
                }
              });
            });
        }
      });
    } else {
      await moviedb
        .searchTv(parameters)
        .then((res) => {
          let results = res.results;
          // Filter out unreleased content when strict mode is on
          if ((config.strictRegionFilter === "true" || config.strictRegionFilter === true)) {
            const today = new Date().toISOString().split('T')[0];
            results = results.filter(el => {
              if (!el.first_air_date) return true; // No date, include it
              return el.first_air_date <= today;
            });
          }
          results.map((el) => { searchResults.push(parseMedia(el, 'tv', genreList)) });
        })
        .catch(console.error);

      if (searchResults.length === 0) {
        await moviedb
          .searchTv({ query: searchQuery, language, include_adult: config.includeAdult })
          .then((res) => {
            res.results.map((el) => { searchResults.push(parseMedia(el, 'tv', genreList)) });
          })
          .catch(console.error);
      }

      await moviedb.searchPerson({ query: query, language }).then(async (res) => {
        if (res.results[0]) {
          await moviedb
            .personTvCredits({ id: res.results[0].id, language })
            .then((credits) => {
              credits.cast.map((el) => {
                if (el.episode_count >= 5) {
                  if (!searchResults.find((meta) => meta.id === `tmdb:${el.id}`)) {
                    searchResults.push(parseMedia(el, 'tv', genreList));
                  }
                }
              });
              credits.crew.map((el) => {
                if (el.job === "Director" || el.job === "Writer") {
                  if (!searchResults.find((meta) => meta.id === `tmdb:${el.id}`)) {
                    searchResults.push(parseMedia(el, 'tv', genreList));
                  }
                }
              });
            });
        }
      });
    }
  }

  // Final filter for strict region mode - checks actual regional release dates
  // (catches results from all paths: main search, fallback search, and person credits)
  if ((config.strictRegionFilter === "true" || config.strictRegionFilter === true) && language && language.split('-')[1]) {
    const region = language.split('-')[1];

    if (type === "movie") {
      // For movies, check actual regional release dates
      const releaseChecks = await Promise.all(
        searchResults.map(async (item) => {
          // Extract TMDB ID from item.id (format: "tmdb:123456")
          const tmdbId = item.id ? parseInt(item.id.replace('tmdb:', ''), 10) : null;
          if (!tmdbId) return { item, released: true };

          const released = await isMovieReleasedInRegion(tmdbId, region);
          return { item, released };
        })
      );

      searchResults = releaseChecks
        .filter(check => check.released)
        .map(check => check.item);
    } else {
      // For TV shows, use first_air_date (not region-specific but best available)
      const today = new Date().toISOString().split('T')[0];
      searchResults = searchResults.filter(item => {
        if (!item.year) return true;
        const itemYear = parseInt(item.year, 10);
        const currentYear = new Date().getFullYear();
        // Exclude future years
        if (itemYear > currentYear) return false;
        return true;
      });
    }
  }

  return Promise.resolve({ query, metas: searchResults });
}

module.exports = { getSearch };
