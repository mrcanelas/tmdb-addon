require('dotenv').config();
const { MovieDb } = require('moviedb-promise');
const fetch = require('node-fetch');

const moviedb = new MovieDb(process.env.TMDB_API);


const TVMAZE_API_URL = 'https://api.tvmaze.com';

/**
 * Finds the TMDB ID for a given IMDB ID.
 * This is kept for movies.
 * @param {'movie'|'series'} type - The type of content.
 * @param {string} imdbId - The IMDB ID (e.g., 'tt0133093').
 * @returns {Promise<number|null>} The TMDB ID or null if not found.
 */
async function getTmdbId(type, imdbId) {
  try {
    const resultsKey = type === 'movie' ? 'movie_results' : 'tv_results';
    const res = await moviedb.find({ id: imdbId, external_source: 'imdb_id' });
    
    return res[resultsKey] && res[resultsKey][0] ? res[resultsKey][0].id : null;
  } catch (error) {
    console.error(`Error finding TMDB ID for ${imdbId}:`, error.message);
    return null;
  }
}

/**
 * Finds the TVmaze ID for a given IMDB ID.
 * This is our new function for series.
 * @param {string} imdbId - The IMDB ID (e.g., 'tt0903747').
 * @returns {Promise<number|null>} The TVmaze ID or null if not found.
 */
async function getTvmazeId(imdbId) {
  const url = `${TVMAZE_API_URL}/lookup/shows?imdb=${imdbId}`;
  try {
    const response = await fetch(url);
    if (response.status === 404) {
      return null;
    }
    const data = await response.json();
    return data ? data.id : null;
  } catch (error) {
    console.error(`Error finding TVmaze ID for ${imdbId}:`, error.message);
    return null;
  }
}


/**
 * The main resolver function. It decides which service to query
 * based on the content type.
 * @param {'movie'|'series'} type - The content type.
 * @param {string} imdbId - The IMDB ID.
 * @returns {Promise<number|null>} The service-specific ID (TMDB for movie, TVmaze for series).
 */
async function resolveId(type, imdbId) {
  if (type === 'movie') {
    return await getTmdbId('movie', imdbId);
  }
  
  if (type === 'series') {
    return await getTvmazeId(imdbId);
  }
  
  
  return null;
}

module.exports = { resolveId };
