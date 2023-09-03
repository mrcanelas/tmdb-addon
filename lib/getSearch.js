import "dotenv/config"
import { MovieDb } from "moviedb-promise";
const moviedb = new MovieDb(process.env.tmdb_api);

async function getSearch(type, language, query, include_adult) {
  if (type === "movie") {
    const searchMovie = []
    await moviedb
      .searchMovie({ query, language, include_adult })
      .then(({ results }) => {
        results.map((el) => {
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
    await moviedb.searchPerson({ query, language }).then(async ({ results }) => {
      if (results[0]) {
        await moviedb
          .personMovieCredits({ id: results[0].id, language })
          .then(({ cast, crew }) => {
            cast.map((el) => {
              if (!searchMovie.find(({ id }) => id === `tmdb:${el.id}`)) {
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
            crew.map((el) => {
              if (el.job === "Director" || "Writer") {
                if (!searchMovie.find(({ id }) => id === `tmdb:${el.id}`)) {
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
    return Promise.resolve({ query, metas: sortMetas });
  } else {
    const searchTv = []
    await moviedb
      .searchTv({ query, language, include_adult })
      .then(({ results }) => {
        results.map((el) => {
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
    await moviedb.searchPerson({ query, language }).then(async ({ results }) => {
      if (results[0]) {
        await moviedb
          .personTvCredits({ id: results[0].id, language })
          .then(({ cast, crew }) => {
            cast.map((el) => {
              if (el.episode_count >= 5) {
                if (!searchTv.find(({ id }) => id === `tmdb:${el.id}`)) {
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
            crew.map((el) => {
              if (el.job === "Director" || "Writer") {
                if (!searchTv.find(({ id }) => id === `tmdb:${el.id}`)) {
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
    return Promise.resolve({ query, metas: sortMetas });
  }
}

export default getSearch;
