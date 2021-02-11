const { MovieDb } = require("moviedb-promise");
const { getCredits } = require("./getCredits");
const { getDirector } = require("./getDirector");
const { getExternal } = require("./getExternal");
const { getVideos } = require("./getVideos");
const { getEpisodes } = require("./getEpisodes");
const { getLogo, getTvLogo } = require("./getLogo");
const moviedb = new MovieDb(process.env.tmdb_api);

async function getMeta(type, language, tmdbId) {
  if (type === "movie") {
    const videos = await getVideos(type, language, tmdbId);
    const cast = await getCredits(type, language, tmdbId);
    const director = await getDirector(type, language, tmdbId);
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
      original_language,
    } = await metas;
    const logo = await getLogo(tmdbId, language, original_language);
    const genero = genres.map((el) => {
      return el.name;
    });
    let meta = {
      id: `tmdb:${tmdbId}`,
      imdb_id: `${imdb_id}`,
      type: type,
      name: `${title}`,
      slug: `movie/${title.toLowerCase().split(' ').join('-')}-${imdb_id.replace('tt', '')}`,
      imdbRating: `${vote_average}`,
      genres: genero,
      cast: cast,
      director: [`${director}`],
      poster: `https://image.tmdb.org/t/p/original${poster_path}`,
      posterShape: "regular",
      description: `${overview}`,
      runtime: `${runtime} min`,
      background: `https://image.tmdb.org/t/p/original${backdrop_path}`,
      logo: logo,
      releaseInfo: `${release_date.substr(0, 4)}`,
      trailers: videos,
      videos: [
        {
          id: imdb_id,
          title: title,
          released: new Date(release_date).toISOString(),
        }
      ]
    };
    return Promise.resolve({ meta });
  } else {
    const videos = await getVideos(type, language, tmdbId);
    const cast = await getCredits(type, language, tmdbId);
    let { imdb_id, tvdb_id } = await getExternal(type, tmdbId);
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
      original_language,
    } = await metas;
    const logo = await getTvLogo(tvdb_id, language, original_language);
    const genero = genres.map((el) => {
      return el.name;
    });
    const writer = created_by.slice(0, 1).map((el) => {
      return el.name;
    });
    function year() {
      if (status === "Ended") {
        return first_air_date.substr(0, 5) + last_air_date.substr(0, 4);
      } else {
        return first_air_date.substr(0, 5);
      }
    }
    const mapEpisodes = await getEpisodes(language, tmdbId, imdb_id, seasons);
    let meta = {
      id: `tmdb:${tmdbId}`,
      imdb_id: `${imdb_id}`,
      type: type,
      name: `${name}`,
      slug: `series/${name.toLowerCase().split(' ').join('-')}-${imdb_id.replace('tt', '')}`,
      imdbRating: `${vote_average}`,
      genres: genero,
      cast: cast,
      writer: writer,
      poster: `https://image.tmdb.org/t/p/original${poster_path}`,
      posterShape: "regular",
      description: `${overview}`,
      runtime: `${episode_run_time.slice(0, 1)} min`,
      background: `https://image.tmdb.org/t/p/original${backdrop_path}`,
      logo: logo,
      releaseInfo: year(),
      trailers: videos,
      videos: [].concat(...mapEpisodes),
    };
    return Promise.resolve({ meta });
  }
}

module.exports = { getMeta };
