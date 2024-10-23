require("dotenv").config();
const { MovieDb } = require("moviedb-promise");
const Utils = require("../utils/parseProps");
const moviedb = new MovieDb(process.env.TMDB_API);
const { getEpisodes } = require("./getEpisodes");
const { getLogo, getTvLogo } = require("./getLogo");
const { getImdbRating } = require("./getImdbRating");


const blacklistLogoUrls = [
  // fanart bug, responds with "The Crime" logo for all IDs it considers invalid
  "https://assets.fanart.tv/fanart/tv/0/hdtvlogo/-60a02798b7eea.png",
];

async function getMeta(type, language, tmdbId, rpdbkey) {
  if (type === "movie") {
    const meta = await moviedb
      .movieInfo({id: tmdbId, language, append_to_response: "videos,credits",})
      .then(async (res) => {
        const resp = {
          imdb_id: res.imdb_id,
          cast: Utils.parseCast(res.credits),
          country: Utils.parseCoutry(res.production_countries),
          description: res.overview,
          director: Utils.parseDirector(res.credits),
          genre: Utils.parseGenres(res.genres),
          imdbRating: res.imdb_id ? await getImdbRating(res.imdb_id, type) : res.vote_average.toFixed(1),
          name: res.title,
          released: new Date(res.release_date),
          slug: Utils.parseSlug(type, res.title, res.imdb_id),
          type: type,
          writer: Utils.parseWriter(res.credits),
          year: res.release_date ? res.release_date.substr(0, 4) : "",
          trailers: Utils.parseTrailers(res.videos),
          background: `https://image.tmdb.org/t/p/original${res.backdrop_path}`,
          poster: await Utils.parsePoster(type, tmdbId, res.poster_path, language, rpdbkey),
          runtime: Utils.parseRunTime(res.runtime),
          id: `tmdb:${tmdbId}`,
          genres: Utils.parseGenres(res.genres),
          releaseInfo: res.release_date ? res.release_date.substr(0, 4) : "",
          trailerStreams: Utils.parseTrailerStream(res.videos),
          links: new Array(
            Utils.parseImdbLink(res.vote_average, res.imdb_id),
            Utils.parseShareLink(res.title, res.imdb_id, type),
            ...Utils.parseGenreLink(res.genres, type, language),
            ...Utils.parseCreditsLink(res.credits)
          ),
          behaviorHints: {
            defaultVideoId: res.imdb_id ? res.imdb_id : `tmdb:${res.id}`,
            hasScheduledVideos: false
          },
        };
        try {
          resp.logo = await getLogo(tmdbId, language, res.original_language);
        } catch(e) {
          console.log(`warning: logo could not be retrieved for ${tmdbId} - ${type}`);
          console.log((e || {}).message || "unknown error");
        }
        if (resp.logo && blacklistLogoUrls.includes(resp.logo)) {
          delete resp.logo;
        }
        if (resp.logo) {
          resp.logo = resp.logo.replace("http://", "https://")
        }
        return resp;
      })
      .catch(console.error);
    return Promise.resolve({ meta });
  } else {
    const meta = await moviedb
      .tvInfo({id: tmdbId, language, append_to_response: "videos,credits,external_ids",})
      .then(async (res) => {
        const resp = {
          cast: Utils.parseCast(res.credits),
          country: Utils.parseCoutry(res.production_countries),
          description: res.overview,
          genre: Utils.parseGenres(res.genres),
          imdbRating: res.external_ids.imdb_id ? await getImdbRating(res.external_ids.imdb_id, type) : res.vote_average.toFixed(1),
          imdb_id: res.external_ids.imdb_id,
          name: res.name,
          poster: await Utils.parsePoster(type, tmdbId, res.poster_path, language, rpdbkey),
          released: new Date(res.first_air_date),
          runtime: Utils.parseRunTime(res.episode_run_time[0]),
          status: res.status,
          type: type,
          writer: Utils.parseCreatedBy(res.created_by),
          year: Utils.parseYear(res.status, res.first_air_date, res.last_air_date),
          background: `https://image.tmdb.org/t/p/original${res.backdrop_path}`,
          slug: Utils.parseSlug(type, res.name, res.external_ids.imdb_id),
          id: `tmdb:${tmdbId}`,
          genres: Utils.parseGenres(res.genres),
          releaseInfo: Utils.parseYear(res.status, res.first_air_date, res.last_air_date),
          videos: [],
          links: new Array(
            Utils.parseImdbLink(res.vote_average, res.external_ids.imdb_id),
            Utils.parseShareLink(res.name, res.external_ids.imdb_id, type),
            ...Utils.parseGenreLink(res.genres, type, language),
            ...Utils.parseCreditsLink(res.credits)
          ),
          trailers: Utils.parseTrailers(res.videos),
          trailerStreams: Utils.parseTrailerStream(res.videos),
          behaviorHints: {
            defaultVideoId: null,
            hasScheduledVideos: true
          }
        };
        try {
          resp.logo = await getTvLogo(res.external_ids.tvdb_id, res.id, language, res.original_language);
        } catch(e) {
          console.log(`warning: logo could not be retrieved for ${tmdbId} - ${type}`);
          console.log((e || {}).message || "unknown error");
        }
        if (resp.logo && blacklistLogoUrls.includes(resp.logo || '')) {
          delete resp.logo;
        }
        if (resp.logo) {
          resp.logo = resp.logo.replace("http://", "https://")
        }
        try {
          resp.videos = await getEpisodes(language, tmdbId, res.external_ids.imdb_id, res.seasons);
        } catch(e) {
          console.log(`warning: episodes could not be retrieved for ${tmdbId} - ${type}`);
          console.log((e || {}).message || "unknown error");
        }
        return resp;

      })
      .catch(console.error);
    return Promise.resolve({ meta });
  }
}

module.exports = { getMeta };