require("dotenv").config();
const { getMeta } = require("./getMeta");
const { getTmdb } = require("./getTmdb");

/**
 * Handles calendar-videos and last-videos catalog requests for Stremio calendar.
 * These catalogs receive a list of series IDs from the user's library and return
 * metadata with upcoming/recent episodes.
 * 
 * @param {string} type - Content type (should be "series")
 * @param {string} language - Language code (e.g., "it-IT")
 * @param {string} idsString - Comma-separated list of series IDs (format: "tmdb:123" or "tt1234567")
 * @param {object} config - Addon configuration
 * @returns {Promise<{metas: Array}>} Array of series metadata with videos
 */
async function getCalendarMetas(type, language, idsString, config) {
  if (!idsString || idsString.trim() === "") {
    return { metas: [] };
  }

  const ids = idsString.split(",").filter(id => id.trim() !== "");
  
  if (ids.length === 0) {
    return { metas: [] };
  }

  const metas = [];
  
  // Process each series ID
  for (const rawId of ids) {
    const id = rawId.trim();
    
    try {
      let tmdbId = null;
      
      // Handle different ID formats
      if (id.startsWith("tmdb:")) {
        // Direct TMDB ID
        tmdbId = id.replace("tmdb:", "");
      } else if (id.startsWith("tt")) {
        // IMDb ID - convert to TMDB ID
        tmdbId = await getTmdb(type, id, config);
      } else if (/^\d+$/.test(id)) {
        // Plain numeric ID (assume TMDB)
        tmdbId = id;
      }
      
      if (tmdbId) {
        const result = await getMeta(type, language, tmdbId, config);
        if (result && result.meta && result.meta.id) {
          metas.push(result.meta);
        }
      }
    } catch (err) {
      console.error(`[getCalendarMetas] Error fetching meta for ${id}:`, err.message);
      // Continue with next ID on error
    }
  }

  return { metas };
}

module.exports = { getCalendarMetas };
