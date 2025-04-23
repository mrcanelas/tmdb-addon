require("dotenv").config();
const { MovieDb } = require("moviedb-promise");
const moviedb = new MovieDb(process.env.TMDB_API);
const { transliterate } = require("transliteration");
const { parseMedia } = require("../utils/parseProps");
const { getGenreList } = require("./getGenreList");

const DEBUG = process.env.DEBUG === "true";

function log(level, ...args) {
  if (!DEBUG) return;
  const time = new Date().toISOString();
  console[level](`[${time}]`, ...args);
}

function isNonLatin(text) {
  return /[^\u0000-\u007F]/.test(text);
}

async function searchPersonCredits(searchQuery, type, language, genreList) {
  const results = [];

  try {
    const personSearch = await moviedb.searchPerson({ query: searchQuery, language });
    if (personSearch.results.length > 1) {
      log("info", `Multiple people found for "${searchQuery}" — using first result "${personSearch.results[0].name}"`);
    }

    const person = personSearch.results[0];
    if (!person) return results;

    if (type === "movie") {
      const credits = await moviedb.personMovieCredits({ id: person.id, language });
      credits.cast.forEach((el) => {
        if (!results.find((meta) => meta.id === `tmdb:${el.id}`)) {
          results.push(parseMedia(el, 'movie', genreList));
        }
      });
      credits.crew.forEach((el) => {
        if (el.job === "Director" || el.job === "Writer") {
          if (!results.find((meta) => meta.id === `tmdb:${el.id}`)) {
            results.push(parseMedia(el, 'movie', genreList));
          }
        }
      });
    } else {
      const credits = await moviedb.personTvCredits({ id: person.id, language });
      credits.cast.forEach((el) => {
        if (!results.find((meta) => meta.id === `tmdb:${el.id}`)) {
          results.push(parseMedia(el, 'tv', genreList));
        }
      });
      credits.crew.forEach((el) => {
        if (el.job === "Director" || el.job === "Writer") {
          if (!results.find((meta) => meta.id === `tmdb:${el.id}`)) {
            results.push(parseMedia(el, 'tv', genreList));
          }
        }
      });
    }
  } catch (err) {
    console.error("Error during person search:", err);
  }

  return results;
}

async function getSearch(type, language, query, config) {
  log("info", `🔍 Searching for: ${query}`);

  const genreList = await getGenreList(language, type);
  let searchQuery = isNonLatin(query) ? transliterate(query) : query;

  const parameters = {
    query,
    language,
    include_adult: config.includeAdult
  };

  if (config.ageRating) {
    parameters.certification_country = "US";
    const certs = {
      G: type === "movie" ? "G" : "TV-G",
      PG: type === "movie" ? "G|PG" : "TV-G|TV-PG",
      "PG-13": type === "movie" ? "G|PG|PG-13" : "TV-G|TV-PG|TV-14",
      R: type === "movie" ? "G|PG|PG-13|R" : "TV-G|TV-PG|TV-14|TV-MA"
    };
    parameters.certification = certs[config.ageRating];
  }

  const resultList = [];

  try {
    const searchResults = type === "movie"
      ? await moviedb.searchMovie(parameters)
      : await moviedb.searchTv(parameters);

    searchResults.results.forEach(el => {
      resultList.push(parseMedia(el, type, genreList));
    });

    if (resultList.length === 0) {
      log("warn", `No ${type} results found, retrying with fallback transliterated query...`);
      const fallbackResults = type === "movie"
        ? await moviedb.searchMovie({ query: searchQuery, language, include_adult: config.includeAdult })
        : await moviedb.searchTv({ query: searchQuery, language, include_adult: config.includeAdult });

      fallbackResults.results.forEach(el => {
        resultList.push(parseMedia(el, type, genreList));
      });
    }

    const personCredits = await searchPersonCredits(searchQuery, type, language, genreList);
    personCredits.forEach(el => {
      if (!resultList.find(meta => meta.id === el.id)) {
        resultList.push(el);
      }
    });

  } catch (error) {
    console.error("Search error:", error);
  }

  return Promise.resolve({ query, metas: resultList });
}

module.exports = { getSearch };

