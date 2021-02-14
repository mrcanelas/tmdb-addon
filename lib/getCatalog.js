const { MovieDb } = require("moviedb-promise");
const moviedb = new MovieDb(process.env.tmdb_api);
const { getCredits } = require("./getCredits");
const { getDirector } = require("./getDirector");

async function getCatalog(type, id, language, page) {
  if (type === "movie") {
    if (id === "movie.top") {
      var parameters = {
        language: language,
        page: page,
      };
    } 
    else if (id === "movie.national") {
      var parameters = {
        language: language,
        page: page,
        with_original_language: language.split("-")[0]
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
          let { genres } = await moviedb
          .movieInfo({ id: tmdbId, language: language })
          .then((res) => {
            const resp = res;
            return resp;
          })
          .catch(console.error);
          const genero = genres.map((el) => {
            return el.name;
          });
          const year = el.release_date.substr(0, 4);
          return {
            id: `tmdb:${el.id}`,
            name: `${el.title}`,
            genre: genero,
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
    return catalog;
  } else {
    if (id === "series.top") {
      var parameters = {
        language: language,
        page: page,
      };
    } 
    if (id === "series.national") {
      var parameters = {
        language: language,
        page: page,
        with_original_language: language.split("-")[0]
      };
    }
    const catalog = moviedb
      .discoverTv(parameters)
      .then(async (res) => {
        const resp = res.results;
        const metas = await Promise.all(resp.map(async (el) => {
          var tmdbId = el.id
          const cast = await getCredits(type, language, tmdbId);
          let { genres, first_air_date, last_air_date, status } = await moviedb
          .tvInfo({ id: tmdbId, language: language })
          .then((res) => {
            const resp = res;
            return resp;
          })
          .catch(console.error);
          const genero = genres.map((el) => {
            return el.name;
          });
          function year() {
            if (status === "Ended") {
              return first_air_date.substr(0, 5) + last_air_date.substr(0, 4);
            } else {
              return first_air_date.substr(0, 5);
            }
          }
          return {
            id: `tmdb:${el.id}`,
            name: `${el.name}`,
            genre: genero,
            poster: `https://image.tmdb.org/t/p/original${el.poster_path}`,
            posterShape: "regular",
            imdbRating: `${el.vote_average}`,
            year: year(),
            cast: cast,
            type: `${type}`,
            description: `${el.overview}`,
          };
        }));
        return Promise.resolve({ metas });
      })
      .catch(console.error);
    return catalog;
  }
}

module.exports = { getCatalog };
