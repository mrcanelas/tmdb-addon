require('dotenv').config()
const { MovieDb } = require('moviedb-promise')
const moviedb = new MovieDb(process.env.tmdb_api)

async function getSearch(type, language, query, ) {
  if (type === "movie") {
    const searchMovie = await moviedb
      .searchMovie({query, language})
      .then((res) => {
        const metas = res.results.map((el) => {
          return {
            id: `tmdb:${el.id}`,
            name: `${el.title}`,
            poster: `https://image.tmdb.org/t/p/w500${el.poster_path}`,
            type: `${type}`,
          };
        });
        return Promise.resolve({ metas });
      })
      .catch(console.error);
      await moviedb.searchPerson({query, language})
      .then((res) => {
        res.results.map((result) => {
          result.known_for.map((el) => {
            if (el.media_type === 'movie') {
              searchMovie.metas.push({
                id: `tmdb:${el.id}`,
                name: `${el.title}`,
                poster: `https://image.tmdb.org/t/p/w500${el.poster_path}`,
                type: `${type}`,
              });
            }
          });
        })
      })    
    return searchMovie
  } else {
    const searchTv = await moviedb
      .searchTv({query, language})
      .then((res) => {
        const metas = res.results.map((el) => {
          return {
            id: `tmdb:${el.id}`,
            name: `${el.name}`,
            poster: `https://image.tmdb.org/t/p/w500${el.poster_path}`,
            type: `${type}`,
          };
        });
        return Promise.resolve({ metas });
      })
      .catch(console.error);
      await moviedb.searchPerson({query, language})
      .then((res) => {
        res.results.map((result) => {
          result.known_for.map((el) => {
            if (el.media_type === 'tv') {
              searchTv.metas.push({
                id: `tmdb:${el.id}`,
                name: `${el.name}`,
                poster: `https://image.tmdb.org/t/p/w500${el.poster_path}`,
                type: `${type}`,
              });
            }
          });
        });
      })
    return searchTv
  } 
}

module.exports = { getSearch };