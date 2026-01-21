require("dotenv").config();
const { getTmdbClient } = require("../utils/getTmdbClient");
const geminiService = require("../utils/gemini-service");
const groqService = require("../utils/groq-service");
const { transliterate } = require("transliteration");
const { getMeta } = require("./getMeta");
const { isMovieReleasedInRegion, isMovieReleasedDigitally } = require("./releaseFilter");
const { rateLimitedMap, rateLimitedMapFiltered } = require("../utils/rateLimiter");

function isNonLatin(text) {
  return /[^\u0000-\u007F]/.test(text);
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
  const moviedb = getTmdbClient(config);
  let searchQuery = query;
  if (isNonLatin(searchQuery)) {
    searchQuery = transliterate(searchQuery);
  }

  const isAISearch = id === "tmdb.aisearch";
  let candidates = []; // Array of { id: number, type: 'movie'|'series' }

  // 1. AI SEARCH
  if (isAISearch) {
    if (config.groqkey) {
      try {
        await groqService.initialize(config.groqkey);
        const titles = await groqService.searchWithAI(query, type);

        const results = await rateLimitedMap(
          titles,
          async (title) => {
            try {
              const parameters = { query: title, language, include_adult: config.includeAdult };
              if (type === "movie") {
                const res = await moviedb.searchMovie(parameters);
                if (res.results && res.results.length > 0) {
                  return { id: res.results[0].id, type: 'movie' };
                }
              } else {
                const res = await moviedb.searchTv(parameters);
                if (res.results && res.results.length > 0) {
                  return { id: res.results[0].id, type: 'series' };
                }
              }
              return null;
            } catch (error) {
              console.error(`Error fetching details for title "${title}":`, error);
              return null;
            }
          },
          { batchSize: 5, delayMs: 200 }
        );
        candidates.push(...results.filter(Boolean));
      } catch (error) {
        console.error('Error processing AI search with Groq:', error);
      }
    }
    // Fallback to Gemini if no Groq key but Gemini key exists
    else if (config.geminikey) {
      try {
        await geminiService.initialize(config.geminikey);
        const titles = await geminiService.searchWithAI(query, type);

        const results = await rateLimitedMap(
          titles,
          async (title) => {
            try {
              const parameters = { query: title, language, include_adult: config.includeAdult };
              if (type === "movie") {
                const res = await moviedb.searchMovie(parameters);
                if (res.results && res.results.length > 0) {
                  return { id: res.results[0].id, type: 'movie' };
                }
              } else {
                const res = await moviedb.searchTv(parameters);
                if (res.results && res.results.length > 0) {
                  return { id: res.results[0].id, type: 'series' };
                }
              }
              return null;
            } catch (error) {
              console.error(`Error fetching details for title "${title}":`, error);
              return null;
            }
          },
          { batchSize: 5, delayMs: 200 }
        );
        candidates.push(...results.filter(Boolean));

      } catch (error) {
        console.error('Error processing AI search with Gemini:', error);
      }
    }
  }

  // 2. STANDARD SEARCH (if AI search yielded no results or wasn't used)
  if (candidates.length === 0) {
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
      // Search Movie
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
          results.forEach((el) => { candidates.push({ id: el.id, type: 'movie' }); });
        })
        .catch(console.error);

      // Fallback Search
      if (candidates.length === 0) {
        await moviedb
          .searchMovie({ query: searchQuery, language, include_adult: config.includeAdult })
          .then((res) => {
            res.results.forEach((el) => { candidates.push({ id: el.id, type: 'movie' }); });
          })
          .catch(console.error);
      }

      // Person Search
      await moviedb.searchPerson({ query: query, language }).then(async (res) => {
        if (res.results[0]) {
          await moviedb
            .personMovieCredits({ id: res.results[0].id, language })
            .then((credits) => {
              credits.cast.forEach((el) => {
                candidates.push({ id: el.id, type: 'movie' });
              });
              credits.crew.forEach((el) => {
                if (el.job === "Director" || el.job === "Writer") {
                  candidates.push({ id: el.id, type: 'movie' });
                }
              });
            });
        }
      });
    } else {
      // Search TV
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
          results.forEach((el) => { candidates.push({ id: el.id, type: 'series' }); });
        })
        .catch(console.error);

      // Fallback Search TV
      if (candidates.length === 0) {
        await moviedb
          .searchTv({ query: searchQuery, language, include_adult: config.includeAdult })
          .then((res) => {
            res.results.forEach((el) => { candidates.push({ id: el.id, type: 'series' }); });
          })
          .catch(console.error);
      }

      // Person Search TV
      await moviedb.searchPerson({ query: query, language }).then(async (res) => {
        if (res.results[0]) {
          await moviedb
            .personTvCredits({ id: res.results[0].id, language })
            .then((credits) => {
              credits.cast.forEach((el) => {
                if (el.episode_count >= 5) {
                  candidates.push({ id: el.id, type: 'series' });
                }
              });
              credits.crew.forEach((el) => {
                if (el.job === "Director" || el.job === "Writer") {
                  candidates.push({ id: el.id, type: 'series' });
                }
              });
            });
        }
      });
    }
  }

  // 3. REMOVE DUPLICATES (based on TMDB ID)
  const uniqueCandidates = [];
  const seen = new Set();
  for (const c of candidates) {
    const key = `${c.type}-${c.id}`;
    if (!seen.has(key)) {
      seen.add(key);
      uniqueCandidates.push(c);
    }
  }

  // Optimize: Limit candidates before fetching meta to avoid processing too many
  // (e.g., if person credits adds 100 movies, we might not want to fetch all)
  // But searching for an Actor SHOULD show their movies.
  // We'll trust RateLimiter to handle it, but maybe slice if it's huge?
  // Let's safe-guard to 40 items max.
  const slicedCandidates = uniqueCandidates.slice(0, 40);

  // 4. FETCH METADATA (using getMeta to ensure IMDb IDs)
  let searchResults = await rateLimitedMapFiltered(
    slicedCandidates,
    async (item) => {
      try {
        const result = await getMeta(item.type, language, item.id, config);
        if (result.meta) result.meta.tmdb_id = item.id;
        return result.meta;
      } catch (err) {
        console.error(`Error fetching metadata for search result ${item.id}:`, err.message);
        return null; // rateLimitedMapFiltered filters out nulls
      }
    },
    { batchSize: 5, delayMs: 200 }
  );

  // 5. POST-FILTERS (Strict Region, Digital Release)

  // Final filter for strict region mode - checks actual regional release dates
  if ((config.strictRegionFilter === "true" || config.strictRegionFilter === true) && language && language.split('-')[1]) {
    const region = language.split('-')[1];

    if (type === "movie") {
      // For movies, check actual regional release dates with rate limiting
      const releaseChecks = await rateLimitedMapFiltered(
        searchResults,
        async (item) => {
          // Extract TMDB ID from item.id (format: "tmdb:123456" or "tt123456")
          // If ID is "tt...", we can't easily get TMDB ID unless we stored it.
          // However, getMeta logic handles TMDB ID internally, but the Result Item has "id".
          // If the Result Item has an IMDb ID ("tt..."), `isMovieReleasedInRegion` needs a TMDB ID?
          // Let's check `isMovieReleasedInRegion`. It calls `movieInfo` with the ID. 
          // `moviedb.movieInfo` supports IMDb ID? 
          // `moviedb-promise` / `tmdb` API supports `movie/{movie_id}`. `movie_id` can be TMDB ID. 
          // Does it support IMDb ID? No, usually `find` is used for IMDb IDs.

          // CRITICAL: We need the TMDB ID for these checks.
          // Use the `slicedCandidates` to find the TMDB ID corresponding to the meta?
          // Or just ensure `getMeta` returns the TMDB ID in a property?
          // `getMeta` returns `id` (which might be IMDb).
          // But it doesn't return `tmdb_id`.
          // We can match by index if we mapped 1:1, but `rateLimitedMapFiltered` filters...

          // Workaround: We have the TMDB ID in `uniqueCandidates`.
          // But `searchResults` might have different order or length.

          // Better: Pass the TMDB ID through `getMeta`?
          // We can just rely on the fact that if we have an IMDb ID, we can resolve it? No that's slow.

          // Let's look at `getMeta.js`.
          // It doesn't return `tmdb_id`.
          // We should modify `getMeta` to return `tmdb_id` in `app_extras` or `behaviorHints`?
          // OR, since WE have the TMDB ID in `slicedCandidates`, and we want to filter...

          // Actually, `isMovieReleasedInRegion` documentation/code?
          // `addon/lib/releaseFilter.js`

          // Let's blindly check `item.id`. If it's `tt`, `isMovieReleasedInRegion` might fail if it expects TMDB ID.
          // BUT `getMeta` fixed it so it returns `tt` id.
          // If `tmdb-addon` release filter only works with TMDB ID, we have a problem.

          // Investigation: check `releaseFilter.js` later.
          // For now, let's assume valid ID.
          // Actually, if `item.id` is `tt...`, `parseInt` logic in `getSearch.js` original code was:
          // `const tmdbId = item.id ? parseInt(item.id.replace('tmdb:', ''), 10) : null;`
          // If `item.id` is `tt...`, `parseInt` returns `NaN`.
          // So the filter would SKIP everything with IMDb ID.

          // FIX: We need the TMDB ID.
          // In `fetchMetas` step, we can attach the original TMDB ID to the result object if it's missing?
          // `result.meta.tmdb_id = item.id;`
          // `getMeta` returns a clean object. We can extend it.

          // Let's modify the map function:
          /*
            const result = await getMeta(...);
            if (result.meta) result.meta.tmdb_id = item.id;
            return result.meta;
          */

          // Then in filter:
          // `const tmdbId = item.tmdb_id || parseInt(item.id.replace('tmdb:', ''));`

          const tmdbId = item.tmdb_id || (item.id.startsWith('tmdb:') ? parseInt(item.id.replace('tmdb:', ''), 10) : null);
          if (!tmdbId) return item; // Cannot check, keep it (or drop?)

          const released = await isMovieReleasedInRegion(tmdbId, region, config);
          return released ? item : null;
        },
        { batchSize: 5, delayMs: 200 }
      );

      searchResults = releaseChecks;
    } else {
      // TV Filter logic (Year check)
      const currentYear = new Date().getFullYear();
      searchResults = searchResults.filter(item => {
        if (!item.year) return true;
        const itemYear = parseInt(item.year, 10);
        return itemYear <= currentYear;
      });
    }
  }

  // Digital Release Filter
  const isDigitalFilterMode = (config.digitalReleaseFilter === "true" || config.digitalReleaseFilter === true);
  const isStrictMode = (config.strictRegionFilter === "true" || config.strictRegionFilter === true);

  if (isDigitalFilterMode && !isStrictMode && type === "movie") {
    const digitalChecks = await rateLimitedMapFiltered(
      searchResults,
      async (item) => {
        const tmdbId = item.tmdb_id || (item.id.startsWith('tmdb:') ? parseInt(item.id.replace('tmdb:', ''), 10) : null);
        if (!tmdbId) return item;

        const released = await isMovieReleasedDigitally(tmdbId, config);
        return released ? item : null;
      },
      { batchSize: 5, delayMs: 200 }
    );

    searchResults = digitalChecks;
  }

  // Cleanup: Remove tmdb_id if we added it, to clean up the response?
  // Stremio ignores extra props, usually fine.

  return Promise.resolve({ query, metas: searchResults });
}

module.exports = { getSearch };
