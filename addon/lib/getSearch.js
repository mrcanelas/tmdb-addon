require("dotenv").config();
const { MovieDb } = require("moviedb-promise");
const moviedb = new MovieDb(process.env.TMDB_API);
const { transliterate } = require("transliteration");
const { parseMedia } = require("../utils/parseProps");
const { getGenreList } = require("./getGenreList");

function isNonLatin(text) {
  return /[^\u0000-\u007F]/.test(text);
}

async function getSearch(type, language, query, config) {
  const genreList = await getGenreList(language, type);
  let searchQuery = query;

  if (isNonLatin(query)) {
    searchQuery = transliterate(query);
  }

  const parameters = {
    query,
    language,
    include_adult: config.includeAdult
  };

  if (config.ageRating) {
    parameters.certification_country = "US";
    switch(config.ageRating) {
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
    const searchMovie = [];

    await moviedb
      .searchMovie(parameters)
      .then((res) => {
        res.results.map((el) => {searchMovie.push(parseMedia(el, 'movie', genreList));});
      })
      .catch(console.error);

      if (searchMovie.length === 0) {
        await moviedb
          .searchMovie({ query: searchQuery, language, include_adult: config.includeAdult })
          .then((res) => {
            res.results.map((el) => {searchMovie.push(parseMedia(el, 'movie', genreList));});
          })
          .catch(console.error);
      }

    await moviedb.searchPerson({ query: searchQuery, language }).then(async (res) => {
      if (res.results[0]) {
        await moviedb
          .personMovieCredits({ id: res.results[0].id, language })
          .then((credits) => {
            credits.cast.map((el) => {
              if (!searchMovie.find((meta) => meta.id === `tmdb:${el.id}`)) {
                searchMovie.push(parseMedia(el, 'movie', genreList));
              }
            });
            credits.crew.map((el) => {
              if (el.job === "Director" || el.job === "Writer") {
                if (!searchMovie.find((meta) => meta.id === `tmdb:${el.id}`)) {
                  searchMovie.push(parseMedia(el, 'movie', genreList));
                }
              }
            });
          });
      }
    });

    return Promise.resolve({ query, metas: searchMovie });
  } else {
    const searchTv = [];

    await moviedb
      .searchTv(parameters)
      .then((res) => {
        res.results.map((el) => {searchTv.push(parseMedia(el, 'tv', genreList))});
      })
      .catch(console.error);

      if (searchTv.length === 0) {
        await moviedb
          .searchTv({ query: searchQuery, language, include_adult: config.includeAdult })
          .then((res) => {
            res.results.map((el) => {searchTv.push(parseMedia(el, 'tv', genreList))});
          })
          .catch(console.error);
      }

    await moviedb.searchPerson({ query: searchQuery, language }).then(async (res) => {
      if (res.results[0]) {
        await moviedb
          .personTvCredits({ id: res.results[0].id, language })
          .then((credits) => {
            credits.cast.map((el) => {
              if (el.episode_count >= 5) {
                if (!searchTv.find((meta) => meta.id === `tmdb:${el.id}`)) {
                  searchTv.push(parseMedia(el, 'tv', genreList));
                }
              }
            });
            credits.crew.map((el) => {
              if (el.job === "Director" || el.job === "Writer") {
                if (!searchTv.find((meta) => meta.id === `tmdb:${el.id}`)) {
                  searchTv.push(parseMedia(el, 'tv', genreList));
                }
              }
            });
          });
      }
    });

    return Promise.resolve({ query, metas: searchTv });
  }
}

module.exports = { getSearch };
