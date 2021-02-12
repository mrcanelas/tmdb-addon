const { MovieDb } = require("moviedb-promise");
const { getGenreList } = require("./getGenreList");
const { getCredits } = require("./getCredits");
const { getDirector } = require("./getDirector");
const moviedb = new MovieDb(process.env.tmdb_api);

function isNumeric(value) {
  return /^\d+$/.test(value);
}

async function getGenres(type, language, genre, page) {
  const genre_id = await getGenreList(language, type);
  if (type === "movie") {
    if (isNumeric(genre)) {
      var parameters = {
        language: language,
        page: page,
        primary_release_year: genre,
      };
    } else {
      const gen_name = genre_id.find((x) => x.name === genre).id;
      var parameters = {
        language: language,
        page: page,
        with_genres: gen_name,
      };
    }
    const catalog = moviedb
      .discoverMovie(parameters)
      .then(async (res) => {
        const resp = res.results;
        const metas = await Promise.all(resp.map(async (el) => {
          var tmdbId = el.id
          const cast = await getCredits(type, language, tmdbId);
          const director = await getDirector(type, language, tmdbId);
          const genre = el.genre_ids.map((el) => {
            const gen_name = genre_id.find((x) => x.id === el).name;
            return gen_name;
          });
          const year = el.release_date.substr(0, 4);
          return {
            id: `tmdb:${el.id}`,
            name: `${el.title}`,
            genre: genre,
            poster: `https://image.tmdb.org/t/p/original${el.poster_path}`,
            posterShape: "regular",
            imdbRating: `${el.vote_average}`,
            year: year,
            cast: cast,
            director: [`${director}`],
            type: `${type}`,
            description: `${el.overview}`,
          };
        }));
        return Promise.resolve({ metas });
      })
      .catch(console.error);
    return catalog
  } else {
    if (isNumeric(genre)) {
      var parameters = {
        language: language,
        page: page,
        primary_release_year: genre,
      };
    } else {
      const gen_name = genre_id.find((x) => x.name === genre).id;
      var parameters = {
        language: language,
        page: page,
        with_genres: gen_name,
      };
    }
    const catalog = moviedb
      .discoverTv(parameters)
      .then(async (res) => {
        const resp = res.results;
        const metas = await Promise.all(resp.map(async (el) => {
          var tmdbId = el.id
          const cast = await getCredits(type, language, tmdbId);
          const year = el.first_air_date.substr(0, 4);
          return {
            id: `tmdb:${el.id}`,
            name: `${el.name}`,
            genre: `${el.genre_ids}`,
            poster: `https://image.tmdb.org/t/p/original${el.poster_path}`,
            posterShape: "regular",
            imdbRating: `${el.vote_average}`,
            year: year,
            cast: cast,
            type: `${type}`,
            description: `${el.overview}`,
          };
        }));
        return Promise.resolve({ metas });
      })
      .catch(console.error);
    return catalog
  }
}

module.exports = { getGenres };
