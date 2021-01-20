const { MovieDb } = require("moviedb-promise");
const moviedb = new MovieDb(process.env.tmdb_api);
const { getGenreList } = require("./getGenreList")

async function getCatalog(type, language, page) {
  if (type === "movie") {
    const genre_id = await getGenreList(language, type);
    const catalog = moviedb
      .discoverMovie({ language: language, page: page})
      .then((res) => {
        const resp = res.results;
        const metas = resp.map((el) => {
          const genre = el.genre_ids.map((el) => {
            const gen_name = genre_id.find(x => x.id === el).name;
            return gen_name.toString()
          })
          const year = el.release_date.substr(0, 4)
          return {
            id: `tmdb:${el.id}`,
            name: `${el.title}`,
            genre: `${genre}`,
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
    const catalog = moviedb
      .discoverTv({ language: language, page: page})
      .then((res) => {
        const resp = res.results;
        const metas = resp.map((el) => {
          const year = el.first_air_date.substr(0, 4)
          return {
            id: `tmdb:${el.id}`,
            name: `${el.name}`,
            genre: ``,
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

module.exports = { getCatalog };
