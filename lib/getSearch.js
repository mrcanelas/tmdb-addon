require("dotenv").config();
const { MovieDb } = require("moviedb-promise");
const moviedb = new MovieDb(process.env.TMDB_API);
const { transliterate } = require("transliteration");
const { parseMedia } = require("../utils/parseProps");
const Fuse = require('fuse.js');  // Import Fuse.js

function isNonLatin(text) {
  return /[^\u0000-\u007F]/.test(text);
}

/**
 * Perform a fuzzy search using Fuse.js
 * @param {string} query - The user's search query.
 * @param {Array} results - The results from TMDB.
 * @returns {Array} - Filtered results based on fuzzy matching.
 */
function fuzzySearch(query, results) {
  const fuse = new Fuse(results, {
    keys: ['title'],  // Key to match the search query
    threshold: 0.3,   // Adjust threshold for fuzzy matching
  });

  return fuse.search(query).map(result => result.item);
}

async function getSearch(type, language, query, include_adult) {
  let searchQuery = query;

  if (isNonLatin(query)) {
    searchQuery = transliterate(query);
  }

  if (type === "movie") {
    const searchMovie = [];

    await moviedb
      .searchMovie({ query, language, include_adult })
      .then((res) => {
        res.results.map((el) => { searchMovie.push(parseMedia(el, 'movie')); });
      })
      .catch(console.error);

    // Apply fuzzy search if no movies found
    if (searchMovie.length === 0) {
      await moviedb
        .searchMovie({ query: searchQuery, language, include_adult })
        .then((res) => {
          res.results.map((el) => { searchMovie.push(parseMedia(el, 'movie')); });
        })
        .catch(console.error);

      // Fuzzy search on the results
      if (searchMovie.length > 0) {
        const fuzzyResults = fuzzySearch(query, searchMovie);
        return Promise.resolve({ query, metas: fuzzyResults });
      }
    }

    await moviedb.searchPerson({ query: searchQuery, language }).then(async (res) => {
      if (res.results[0]) {
        await moviedb
          .personMovieCredits({ id: res.results[0].id, language })
          .then((credits) => {
            credits.cast.map((el) => {
              if (!searchMovie.find((meta) => meta.id === `tmdb:${el.id}`)) {
                searchMovie.push(parseMedia(el, 'movie'));
              }
            });
            credits.crew.map((el) => {
              if (el.job === "Director" || el.job === "Writer") {
                if (!searchMovie.find((meta) => meta.id === `tmdb:${el.id}`)) {
                  searchMovie.push(parseMedia(el, 'movie'));
                }
              }
            });
          });
      }
    });

    const sortMetas = searchMovie.sort((a, b) => b.popularity - a.popularity);
    return Promise.resolve({ query, metas: sortMetas });
  } else {
    const searchTv = [];

    await moviedb
      .searchTv({ query, language, include_adult })
      .then((res) => {
        res.results.map((el) => { searchTv.push(parseMedia(el, 'tv')); });
      })
      .catch(console.error);

    // Fuzzy search on TV results if no matches are found
    if (searchTv.length === 0) {
      await moviedb
        .searchTv({ query: searchQuery, language, include_adult })
        .then((res) => {
          res.results.map((el) => { searchTv.push(parseMedia(el, 'tv')); });
        })
        .catch(console.error);

      if (searchTv.length > 0) {
        const fuzzyResults = fuzzySearch(query, searchTv);
        return Promise.resolve({ query, metas: fuzzyResults });
      }
    }

    await moviedb.searchPerson({ query: searchQuery, language }).then(async (res) => {
      if (res.results[0]) {
        await moviedb
          .personTvCredits({ id: res.results[0].id, language })
          .then((credits) => {
            credits.cast.map((el) => {
              if (el.episode_count >= 5) {
                if (!searchTv.find((meta) => meta.id === `tmdb:${el.id}`)) {
                  searchTv.push(parseMedia(el, 'tv'));
                }
              }
            });
            credits.crew.map((el) => {
              if (el.job === "Director" || el.job === "Writer") {
                if (!searchTv.find((meta) => meta.id === `tmdb:${el.id}`)) {
                  searchTv.push(parseMedia(el, 'tv'));
                }
              }
            });
          });
      }
    });

    const sortMetas = searchTv.sort((a, b) => b.popularity - a.popularity);
    return Promise.resolve({ query, metas: sortMetas });
  }
}

module.exports = { getSearch };
