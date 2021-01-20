const { MovieDb } = require("moviedb-promise");
const { getCredits } = require("./getCredits");
const { getDirector } = require("./getDirector");
const { getExternal } = require("./getExternal");
const { getVideos } = require("./getVideos");
const { getEpisodes } = require("./getEpisodes");
const { getLogo } = require("./getLogo");
const moviedb = new MovieDb("5a5366fc507321122c90b2b809b5ab20");

async function getMeta(type, language, tmdbId) {
  if (type === "movie") {
    const get_logo = await getLogo(type, tmdbId)
    const logo = get_logo.map((el) => {
      return el.url
    })
    const resp = await getVideos(type, language, tmdbId);
    const credits = await getCredits(type, language, tmdbId);
    const crew = await getDirector(type, language, tmdbId);
    const cast = credits.slice(0, 4).map((el) => {
      return el.name;
    });
    const director = crew.find((x) => x.job === "Director").name;
    const metas = moviedb
      .movieInfo({ id: tmdbId, language: language })
      .then((res) => {
        const resp = res;
        return resp;
      })
      .catch(console.error);
    let {
      title,
      imdb_id,
      poster_path,
      genres,
      overview,
      vote_average,
      release_date,
      runtime,
      backdrop_path,
    } = await metas;
    const genero = genres.map((el) => {
      return el.name;
    });
    const videos = resp.map((el) => {
      return {
        source: `${el.key}`,
        type: `${el.type}`,
      };
    });
    let meta = {
      id: `tmdb:${tmdbId}`,
      imdb_id: `${imdb_id}`,
      type: type,
      name: `${title}`,
      imdbRating: `${vote_average}`,
      genres: genero,
      cast: cast,
      director: [`${director}`],
      poster: `https://image.tmdb.org/t/p/original${poster_path}`,
      posterShape: "regular",
      description: `${overview}`,
      runtime: `${runtime} mim`,
      background: `https://image.tmdb.org/t/p/original${backdrop_path}`,
      logo: (logo.slice(0,1)).toString(),
      releaseInfo: `${release_date.substr(0, 4)}`,
      trailers: videos,
    };
    return Promise.resolve({ meta });
  } else {
    const resp = await getVideos(type, language, tmdbId);
    const credits = await getCredits(type, language, tmdbId);
    let { imdb_id, tvdb_id } = await getExternal(type, tmdbId);
    const cast = credits.slice(0, 4).map((el) => {
      return el.name;
    });
    const metas = moviedb
      .tvInfo({ id: tmdbId, language: language })
      .then((res) => {
        const resp = res;
        return resp;
      })
      .catch(console.error);
    let {
      name,
      poster_path,
      genres,
      overview,
      vote_average,
      first_air_date,
      last_air_date,
      episode_run_time,
      backdrop_path,
      seasons,
      created_by,
      status,
    } = await metas;
    const genero = genres.map((el) => {
      return el.name;
    });
    const writer = created_by.slice(0, 1).map((el) => {
      return el.name;
    });
    const videos = resp.map((el) => {
      return {
        source: `${el.key}`,
        type: `${el.type}`,
      };
    });
    function year() {
      if (status === "Ended") {
        return first_air_date.substr(0, 5) + last_air_date.substr(0, 4)
      } else {
        return first_air_date.substr(0, 5)
      }
    }
    const mapEpisodes = await getEpisodes(language, tmdbId, imdb_id, seasons);
    const get_logo = await getLogo(tvdb_id, type)
    const logo = get_logo.map((el) => {
      return el.url
    })
    let meta = {
      id: `tmdb:${tmdbId}`,
      imdb_id: `${imdb_id}`,
      type: type,
      name: `${name}`,
      imdbRating: `${vote_average}`,
      genres: genero,
      cast: cast,
      writer: writer,
      poster: `https://image.tmdb.org/t/p/original${poster_path}`,
      posterShape: "regular",
      description: `${overview}`,
      runtime: `${episode_run_time.slice(0, 1)} mim`,
      background: `https://image.tmdb.org/t/p/original${backdrop_path}`,
      logo: (logo.slice(0,1)).toString(),
      releaseInfo: year(),
      trailers: videos,
      videos: [].concat(...mapEpisodes),
    };
    return Promise.resolve({ meta });
  }
}

module.exports = { getMeta };
