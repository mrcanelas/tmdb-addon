require('dotenv').config();
const FanartTvApi = require("fanart.tv-api");
const apiKey = process.env.FANART_API;
const baseUrl = "http://webservice.fanart.tv/v3/";
const fanart = new FanartTvApi({ apiKey, baseUrl });

const { getTmdbClient } = require("../utils/getTmdbClient");
const TARGET_ASPECT_RATIO = 4.0;

function pickLogo(logos, language, originalLanguage) {
  const fullLang = language;         // Ex: 'pt-BR'
  const baseLang = language.split("-")[0]; // Ex: 'pt'

  const sortedLogos = logos
    .map(logo => {
      let score = 0;
      const logoLang = logo.lang;
      if (logoLang === fullLang) {
        score = 4;
      }
      else if (logoLang.startsWith(baseLang + '-')) {
        score = 3;
      }
      else if (logoLang === baseLang) {
        score = 2;
      }
      else if (logoLang === 'en') {
        score = 1;
      }
      else if (logoLang === originalLanguage && logoLang !== 'en') {
        score = 0.5;
      }

      let aspectRatioDiff = 999;
      if (logo.source === 'tmdb' && logo.aspect_ratio) {
        aspectRatioDiff = Math.abs(logo.aspect_ratio - TARGET_ASPECT_RATIO);
      }

      return {
        ...logo,
        score,
        fanartLikes: logo.source === 'fanart' ? (parseInt(logo.likes) || 0) : 0,
        tmdbVotes: logo.source === 'tmdb' ? (logo.vote_average || 0) : 0,
        aspectRatioDiff: aspectRatioDiff
      };
    })
    .sort((a, b) => {
      if (a.score !== b.score) {
        return b.score - a.score;
      }
      if (a.source === 'tmdb' && b.source === 'tmdb') {
        if (a.aspectRatioDiff !== b.aspectRatioDiff) {
          return a.aspectRatioDiff - b.aspectRatioDiff;
        }
        return b.tmdbVotes - a.tmdbVotes;
      }
      if (a.source === 'fanart' && b.source === 'fanart') {
        return b.fanartLikes - a.fanartLikes;
      }
      if (a.source === 'fanart' && b.source !== 'fanart') return -1;
      if (a.source !== 'fanart' && b.source === 'fanart') return 1;

      return 0;
    });

  const picked = sortedLogos[0];
  return picked;
}

async function getLogo(tmdbId, language, originalLanguage, config = {}) {
  try {
    if (!tmdbId) {
      throw new Error(`TMDB ID not available for logo: ${tmdbId}`);
    }

    const moviedb = getTmdbClient(config);
    const [fanartRes, tmdbRes] = await Promise.all([
      fanart
        .getMovieImages(tmdbId)
        .then(res => res.hdmovielogo || [])
        .catch(() => []),

      moviedb
        .movieImages({ id: tmdbId })
        .then(res => res.logos || [])
        .catch(() => [])
    ])

    const fanartLogos = fanartRes.map(l => ({
      url: l.url,
      lang: l.lang || 'en',
      fanartLikes: l.likes || 0,
      source: 'fanart'
    }));

    const tmdbLogos = tmdbRes.map(l => ({
      url: `https://image.tmdb.org/t/p/original${l.file_path}`,
      lang: `${l.iso_639_1}-${l.iso_3166_1}` || 'en',
      tmdbVotes: l.vote_average || 0,
      source: 'tmdb'
    }));

    const combined = [...fanartLogos, ...tmdbLogos];

    if (combined.length === 0) return '';

    const picked = pickLogo(combined, language, originalLanguage);
    return picked?.url || '';
  } catch (error) {
    if (error.message !== "TMDB_API_KEY_MISSING") {
      console.error(`Error fetching logo for movie ${tmdbId}:`, error.message);
    }
    return '';
  }
}

async function getTvLogo(tvdb_id, tmdbId, language, originalLanguage, config = {}) {
  try {
    if (!tvdb_id && !tmdbId) {
      throw new Error(`TVDB ID and TMDB ID not available for logos.`);
    }

    const moviedb = getTmdbClient(config);
    const [fanartRes, tmdbRes] = await Promise.all([
      tvdb_id
        ? fanart
          .getShowImages(tvdb_id)
          .then(res => res.hdtvlogo || [])
          .catch(() => [])
        : Promise.resolve([]),

      tmdbId
        ? moviedb
          .tvImages({ id: tmdbId })
          .then(res => res.logos || [])
          .catch(() => [])
        : Promise.resolve([])
    ]);

    const fanartLogos = fanartRes.map(l => ({
      url: l.url,
      lang: l.lang || 'en',
      fanartLikes: l.likes || 0,
      source: 'fanart'
    }));

    const tmdbLogos = tmdbRes.map(l => ({
      url: `https://image.tmdb.org/t/p/original${l.file_path}`,
      lang: `${l.iso_639_1}-${l.iso_3166_1}` || 'en',
      tmdbVotes: l.vote_average || 0,
      source: 'tmdb'
    }));

    const combined = [...fanartLogos, ...tmdbLogos];

    if (combined.length === 0) return '';

    const picked = pickLogo(combined, language, originalLanguage);
    return picked?.url || '';
  } catch (error) {
    if (error.message !== "TMDB_API_KEY_MISSING") {
      console.error(`Error fetching logo for series ${tmdbId}:`, error.message);
    }
    return '';
  }
}

module.exports = { getLogo, getTvLogo };
