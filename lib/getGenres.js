const { MovieDb } = require("moviedb-promise");
const { getGenreList } = require("./getGenreList");
const moviedb = new MovieDb("5a5366fc507321122c90b2b809b5ab20");

async function getGenres(type, language, genre, page) {
  if (type === "movie") {
    const genre_id = await getGenreList(language, type);
    const gen_name = genre_id.find(x => x.name === genre).id;
    const catalog = moviedb
      .discoverMovie({ language: language, page: page, with_genres: gen_name})
      .then((res) => {
        const resp = res.results;
        const metas = resp.map((el) => {
          const year = el.release_date.substr(0, 4)     
          return {
            id: `tmdb:${el.id}`,
            name: `${el.title}`,
            genre: `${el.genre_ids}`,
            poster: `https://image.tmdb.org/t/p/original${el.poster_path}`,
            posterShape: "regular",
            imdbRating: `${el.vote_average}`,
            year: year,
            type: `${type}`,
            description: `${el.overview}`,
          };
        });
        return Promise.resolve({ metas });
      })
      .catch(console.error);
    return catalog
  } else {
    const genre_id = await getGenreList(language, type);
    const gen_name = genre_id.find(x => x.name === genre).id;
    const catalog = moviedb
      .discoverTv({ language: language, page: page, with_genres: gen_name})
      .then((res) => {
        const resp = res.results;
        const metas = resp.map((el) => {
          const year = el.first_air_date.substr(0, 4)
          return {
            id: `tmdb:${el.id}`,
            name: `${el.name}`,
            genre: `${el.genre_ids}`,
            poster: `https://image.tmdb.org/t/p/original${el.poster_path}`,
            posterShape: "regular",
            imdbRating: `${el.vote_average}`,
            year: year,
            type: `${type}`,
            description: `${el.overview}`,
          };
        });
        return Promise.resolve({ metas });
      })
      .catch(console.error);
    return catalog
  }
}

module.exports = { getGenres };
