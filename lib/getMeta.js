require("dotenv").config();
const axios = require('axios')
const { getEpisodes } = require("./getEpisodes");
const { getLogo, getTvLogo } = require("./getLogo");

async function getMeta(type, language, tmdbId) {
  if (type === "movie") {
      const meta = await axios
        .get(`https://api.themoviedb.org/3/movie/${tmdbId}?api_key=${process.env.tmdb_api}&language=${language}&append_to_response=videos,credits`)
        .then(async (res) => {
          res = res.data
          const logo = await getLogo(tmdbId, language, res.original_language);
          const metas = {
            id: `tmdb:${tmdbId}`,
            imdb_id: res.imdb_id,
            type: type,
            name: res.title,
            slug: `movie/${res.title.toLowerCase().replace(/ /g, "-")}-${
              res.imdb_id ? res.imdb_id.replace("tt", "") : ""
            }`,
            imdbRating: res.vote_average,
            genres: res.genres.map((el) => {return el.name}),
            cast: res.credits.cast.slice(0, 4).map((el) => {return el.name}),
            director: res.credits.crew
              .filter((x) => x.job === "Director")
              .map((el) => {
                return el.name;
              }),
            poster: `https://image.tmdb.org/t/p/w500${res.poster_path}`,
            posterShape: "regular",
            description: res.overview,
            runtime: res.runtime ? `${res.runtime} min` : "",
            background: `https://image.tmdb.org/t/p/original${res.backdrop_path}`,
            logo: logo,
            releaseInfo: res.release_date ? res.release_date.substr(0, 4) : "",
            trailers: res.videos.results
              .filter((x) => x.type === "Trailer")
              .map((el) => {
                return {
                  source: `${el.key}`,
                  type: `${el.type}`,
                };
              }),
            behaviorHints: {
              defaultVideoId: res.imdb_id ? res.imdb_id : `tmdb:${res.id}`,
            },
            videos: [
              {
                id: res.imdb_id ? res.imdb_id : `tmdb:${res.id}`,
                title: "",
                released: res.release_date ? new Date(res.release_date).toISOString() : new Date().toISOString(),
              },
            ],
          };
          return metas
        })
        .catch(console.error);
    return Promise.resolve({meta})
  } else {
    const meta = await axios
    .get(`https://api.themoviedb.org/3/tv/${tmdbId}?api_key=${process.env.tmdb_api}&language=${language}&append_to_response=videos,credits,external_ids`)
      .then(async (res) => {
        res = res.data
        const logo = await getTvLogo(res.external_ids.tvdb_id, language, res.original_language);
        const mapEpisodes = await getEpisodes(language, tmdbId, res.external_ids.imdb_id, res.seasons);
        function year() {
          if (res.status === "Ended") {
            return res.first_air_date 
              ? res.first_air_date.substr(0, 5) + res.last_air_date.substr(0, 4)
              : "";
          } else {
            return res.first_air_date ? res.first_air_date.substr(0, 5) : "";
          }
        }
        const metas = {
          id: `tmdb:${tmdbId}`,
          imdb_id: res.external_ids.imdb_id,
          type: type,
          name: res.name,
          slug: `series/${res.name.toLowerCase().replace(/ /g, "-")}-${
            res.external_ids.imdb_id ? res.external_ids.imdb_id.replace("tt", "") : ""}`,
          imdbRating: res.vote_average,
          genres: res.genres.map((el) => {return el.name}),
          cast: res.credits.cast.slice(0, 4).map((el) => {return el.name}),
          writer: res.created_by.map((el) => {return el.name}),
          poster: `https://image.tmdb.org/t/p/w500${res.poster_path}`,
          posterShape: "regular",
          description: res.overview,
          runtime: res.episode_run_time ? `${res.episode_run_time.slice(0, 1)} min` : "",
          background: `https://image.tmdb.org/t/p/original${res.backdrop_path}`,
          logo: logo,
          releaseInfo: year(),
          trailers: res.videos.results
          .filter((x) => x.type === "Trailer")
          .map((el) => {
            return {
              source: `${el.key}`,
              type: `${el.type}`,
            };
          }),
          videos: [].concat(...mapEpisodes),
        };
        return metas
      })
      .catch(console.error);
    return Promise.resolve({ meta });
  }
}

module.exports = { getMeta };
