// lib/getGenreList.js

require('dotenv').config();
const { MovieDb } = require('moviedb-promise');
const moviedb = new MovieDb(process.env.TMDB_API);

/**
 * Fetches a list of genres from TMDB for building catalogs.
 *
 * @param {string} language - The language for the genre names (e.g., 'en-US').
 * @param {'movie'|'series'} type - The content type to fetch genres for.
 * @returns {Promise<Array<{id: number, name: string}>>} A list of genre objects, or an empty array on error.
 */
async function getGenreList(language, type) {
  try {
    if (type === "movie") {
      const res = await moviedb.genreMovieList({ language });
      return res.genres || []; 
    } else {
      const res = await moviedb.genreTvList({ language });
      return res.genres || [];
    }
  } catch (error) {
    console.error(`Error fetching ${type} genres from TMDB:`, error.message);
    return [];
  }
}

module.exports = { getGenreList };
