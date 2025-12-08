require('dotenv').config();
const FanartTvApi = require("fanart.tv-api");
const apiKey = process.env.FANART_API;
const baseUrl = "http://webservice.fanart.tv/v3/";
const fanart = new FanartTvApi({ apiKey, baseUrl });

const { TMDBClient } = require("../utils/tmdbClient");
const moviedb = new TMDBClient(process.env.TMDB_API);

function pickLogo(logos, language, originalLanguage) {
    const fullLang = language;         // Ex: 'pt-BR'
    const baseLang = language.split("-")[0]; // Ex: 'pt'

    const priorityOrder = [
        fullLang,
        'en',
        baseLang,
        originalLanguage,
    ];

    const sortedLogos = logos
        .map(logo => {
            const getPriorityIndex = (lang) => {
                const index = priorityOrder.indexOf(lang);
                return index >= 0 ? index : 99;
            };

            const priorityIndex = getPriorityIndex(logo.lang);
            
            return {
                ...logo,
                priorityIndex,
                fanartLikes: logo.source === 'fanart' ? (parseInt(logo.likes) || 0) : 0,
                tmdbVotes: logo.source === 'tmdb' ? (logo.vote_average || 0) : 0
            };
        })
        .sort((a, b) => {
            if (a.priorityIndex !== b.priorityIndex) {
                return a.priorityIndex - b.priorityIndex;
            }
            if (a.source === 'fanart' && b.source === 'fanart') {
                return b.fanartLikes - a.fanartLikes;
            }
            if (a.source === 'tmdb' && b.source === 'tmdb') {
                return b.tmdbVotes - a.tmdbVotes;
            }
            if (a.source === 'fanart' && b.source !== 'fanart') return -1;
            if (a.source !== 'fanart' && b.source === 'fanart') return 1;

            return 0;
        });
   
    const picked = sortedLogos[0];

    return picked;
}

async function getLogo(tmdbId, language, originalLanguage) {
  if (!tmdbId) {
    throw new Error(`TMDB ID not available for logo: ${tmdbId}`);
  }

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
}

async function getTvLogo(tvdb_id, tmdbId, language, originalLanguage) {
  if (!tvdb_id && !tmdbId) {
    throw new Error(`TVDB ID and TMDB ID not available for logos.`);
  }

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
}

module.exports = { getLogo, getTvLogo };
