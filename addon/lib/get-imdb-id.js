// lib/get-imdb-id.js
require('dotenv').config();
const { MovieDb } = require('moviedb-promise');
const moviedb = new MovieDb(process.env.TMDB_API);
const tvmaze = require("./tvmaze");

/**
 * Finds the IMDb ID for a given TMDB ID.
 */
async function getImdbIdFromTmdb(tmdbId, type) {
  try {
    const apiCall = type === 'movie' ? moviedb.movieInfo.bind(moviedb) : moviedb.tvInfo.bind(moviedb);
    const info = await apiCall({ id: tmdbId, append_to_response: 'external_ids' });
    return info.external_ids?.imdb_id || null;
  } catch (error) {
    console.error(`Could not resolve TMDB ID ${tmdbId} to an IMDb ID:`, error.message);
    return null;
  }
}

/**
 * Finds the IMDb ID for a given TVDB ID using the TVmaze API.
 */
async function getImdbIdFromTvdb(tvdbId) {
  try {
    const show = await tvmaze.getShowByTvdbId(tvdbId); 
    return show?.externals?.imdb || null;
  } catch (error) {
    console.error(`Could not resolve TVDB ID ${tvdbId} to an IMDb ID:`, error.message);
    return null;
  }
}

module.exports = { getImdbIdFromTmdb, getImdbIdFromTvdb };
