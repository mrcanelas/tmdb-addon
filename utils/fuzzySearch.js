import Fuse from 'fuse.js';

/**
 * Fuzzy search utility using Fuse.js
 * @param {string} userInput - The user's search input.
 * @param {Array} movies - Array of movie objects fetched from TMDB API.
 * @returns {Array} - Array of matched movie objects.
 */
export function fuzzySearch(userInput, movies) {
  const options = {
    keys: ['title'], // Key in movie objects to match (e.g., title)
    threshold: 0.3,  // Lower = stricter matching
    distance: 100,   // Maximum distance for characters to be considered a match
  };

  const fuse = new Fuse(movies, options);
  return fuse.search(userInput).map((result) => result.item); // Extract movie objects
}
