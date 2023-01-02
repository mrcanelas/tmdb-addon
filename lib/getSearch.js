require("dotenv").config();
const { MovieDb } = require("moviedb-promise");
const { getRpdbPoster } = require("../utils/parseProps");
const moviedb = new MovieDb(process.env.tmdb_api);

async function getSearch(type, language, query) {
  if (type === "movie") {
    const searchMovie = [] 
    await moviedb
      .searchMovie({ query, language })
      .then((res) => {
        res.results.map((el) => {
          searchMovie.push({
            id: `tmdb:${el.id}`,
            name: `${el.title}`,
            poster: `https://image.tmdb.org/t/p/w500${el.poster_path}`,
            type: `${type}`,
            released: new Date(el.release_date),
            popularity: el.popularity,
          });
        });
      })
      .catch(console.error);
    await moviedb.searchPerson({ query, language }).then(async (res) => {
      if (res.results[0]) {
        await moviedb
          .personMovieCredits({ id: res.results[0].id, language })
          .then((credits) => {
            credits.cast.map((el) => {
              if (!searchMovie.find((meta) => meta.id === `tmdb:${el.id}`)) {
                searchMovie.push({
                  id: `tmdb:${el.id}`,
                  name: `${el.title}`,
                  poster: `https://image.tmdb.org/t/p/w500${el.poster_path}`,
                  type: `${type}`,
                  released: new Date(el.release_date),
                  popularity: el.popularity,
                });
              }
            });
            credits.crew.map((el) => {
              if (el.job === "Director" || "Writer") {
                if (!searchMovie.find((meta) => meta.id === `tmdb:${el.id}`)) {
                  searchMovie.push({
                    id: `tmdb:${el.id}`,
                    name: `${el.title}`,
                    poster: `https://image.tmdb.org/t/p/w500${el.poster_path}`,
                    type: `${type}`,
                    released: new Date(el.release_date),
                    popularity: el.popularity,
                  });
                }
              }
            });
          });
      }
    });

    const sortMetas = searchMovie.sort((a, b) => b.popularity - a.popularity);
    return Promise.resolve({query, metas: sortMetas });
  } else {
    const searchTv = [] 
    await moviedb
      .searchTv({ query, language })
      .then((res) => {
        res.results.map((el) => {
          searchTv.push({
            id: `tmdb:${el.id}`,
            name: `${el.name}`,
            poster: `https://image.tmdb.org/t/p/w500${el.poster_path}`,
            type: `${type}`,
            released: new Date(el.first_air_date),
            popularity: el.popularity,
          });
        });
      })
      .catch(console.error);
    await moviedb.searchPerson({ query, language }).then(async (res) => {
      if (res.results[0]) {
        await moviedb
          .personTvCredits({ id: res.results[0].id, language })
          .then((credits) => {
            credits.cast.map((el) => {
              if (el.episode_count >= 5) {
                if (!searchTv.find((meta) => meta.id === `tmdb:${el.id}`)) {
                  searchTv.push({
                    id: `tmdb:${el.id}`,
                    name: `${el.name}`,
                    poster: `https://image.tmdb.org/t/p/w500${el.poster_path}`,
                    type: `${type}`,
                    released: new Date(el.first_air_date),
                    popularity: el.popularity,
                  });
                }
              }
            });
            credits.crew.map((el) => {
              if (el.job === "Director" || "Writer") {
                if (!searchTv.find((meta) => meta.id === `tmdb:${el.id}`)) {
                  searchTv.push({
                    id: `tmdb:${el.id}`,
                    name: `${el.name}`,
                    poster: `https://image.tmdb.org/t/p/w500${el.poster_path}`,
                    type: `${type}`,
                    released: new Date(el.first_air_date),
                    popularity: el.popularity,
                  });
                }
              }
            });
          });
      }
    });
    const sortMetas = searchTv.sort((a, b) => b.popularity - a.popularity);
    return Promise.resolve({query, metas: sortMetas });
  }
}

module.exports = { getSearch };
