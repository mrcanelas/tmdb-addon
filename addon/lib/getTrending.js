require("dotenv").config();
const { MovieDb } = require("moviedb-promise");

const moviedb = new MovieDb(process.env.TMDB_API);
const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p/w500';

async function getTrending(type, language, page, genre, config) {
  try {
    const media_type = type === "series" ? "tv" : type;
    const time_window = genre && ['day', 'week'].includes(genre.toLowerCase()) ? genre.toLowerCase() : "day";
    
    const parameters = {
      media_type,
      time_window,
      language,
      page,
    };

    const res = await moviedb.trending(parameters);

    const metas = res.results.map(item => {
      if (!item.id || !item.poster_path || !(item.title || item.name)) {
        return null;
      }
      return {
        id: `tmdb:${item.id}`,
        type: type,
        name: item.title || item.name,
        poster: `${TMDB_IMAGE_BASE}${item.poster_path}`,
      };
    }).filter(Boolean);

    return { metas };

  } catch (error) {
    console.error(`Error fetching trending for type=${type}:`, error.message);
    return { metas: [] };
  }
}

module.exports = { getTrending };
