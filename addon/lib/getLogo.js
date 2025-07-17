require('dotenv').config();
const FanartTvApi = require("fanart.tv-api");
const { MovieDb } = require("moviedb-promise");

// --- Client Initializations ---
const fanart = new FanartTvApi({ 
  apiKey: process.env.FANART_API,
  baseUrl: "http://webservice.fanart.tv/v3/" 
});
const moviedb = new MovieDb(process.env.TMDB_API);

/**
 * @param {Array} logos - A combined list of logo objects from all sources.
 * @param {string} language - The user's selected language (e.g., 'pt-BR').
 * @param {string} originalLanguage - The media's original language code (e.g., 'ja').
 * @returns {object|undefined} The best-matched logo object.
 */
function pickLogo(logos, language, originalLanguage) {
  if (!logos || logos.length === 0) return undefined;

  const lang = language.split("-")[0]; // 'pt-BR' -> 'pt'

  return (
    logos.find(l => l.lang === lang) ||
    logos.find(l => l.lang === originalLanguage) ||
    logos.find(l => l.lang === "en") ||
    logos[0]
  );
}

/**
 * @param {'movie'|'series'} type - The type of media.
 * @param {{tmdbId: string, tvdbId?: string}} ids - An object containing the necessary IDs.
 * @param {string} language - The user's selected language.
 * @param {string} originalLanguage - The media's original language.
 * @returns {Promise<string>} The URL of the best logo, or an empty string.
 */
async function getLogo(type, ids, language, originalLanguage) {
  try {
    const { tmdbId, tvdbId } = ids;

    let fanartPromise;
    let tmdbPromise;

    if (type === 'movie' && tmdbId) {
      fanartPromise = fanart.getMovieImages(tmdbId);
      tmdbPromise = moviedb.movieImages({ id: tmdbId });
    } else if (type === 'series' && (tmdbId || tvdbId)) {
      fanartPromise = tvdbId ? fanart.getShowImages(tvdbId) : Promise.resolve({});
      
      tmdbPromise = tmdbId ? moviedb.tvImages({ id: tmdbId }) : Promise.resolve({});
    } else {
      return '';
    }

    
    const [fanartRes, tmdbRes] = await Promise.all([
      fanartPromise.catch(() => ({})),
      tmdbPromise.catch(() => ({}))
    ]);

    
    const fanartLogosSource = fanartRes.hdmovielogo || fanartRes.hdtvlogo || [];
    const fanartLogos = fanartLogosSource.map(l => ({
      url: l.url,
      lang: l.lang || 'en', 
    }));

    
    const tmdbLogosSource = tmdbRes.logos || [];
    const tmdbLogos = tmdbLogosSource.map(l => ({
      url: `https://image.tmdb.org/t/p/original${l.file_path}`,
      lang: l.iso_639_1 || 'en',
    }));

    const combined = [...fanartLogos, ...tmdbLogos];

    if (combined.length === 0) return '';

    const picked = pickLogo(combined, language, originalLanguage);
    return picked?.url || ''; 
  } catch (error) {
    console.error(`Error fetching clear logo for type=${type}, ids=${JSON.stringify(ids)}:`, error.message);
    return ''; 
  }
}

module.exports = { getLogo };
