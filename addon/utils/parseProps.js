const { decompressFromEncodedURIComponent } = require('lz-string');
const axios = require('axios');

function parseMedia(el, type, genreList = []) {
  const genres = Array.isArray(el.genre_ids)
    ? el.genre_ids.map(genreId => (genreList.find((g) => g.id === genreId) || {}).name).filter(Boolean)
    : [];

  return {
    id: `tmdb:${el.id}`,
    name: type === 'movie' ? el.title : el.name,
    genre: genres,
    poster: el.poster_path ? `https://image.tmdb.org/t/p/w500${el.poster_path}` : null,
    background: el.backdrop_path ? `https://image.tmdb.org/t/p/original${el.backdrop_path}` : null,
    posterShape: "regular",
    imdbRating: el.vote_average ? el.vote_average.toFixed(1) : 'N/A',
    year: type === 'movie' ? (el.release_date?.substring(0, 4) || '') : (el.first_air_date?.substring(0, 4) || ''),
    type: type === 'movie' ? type : 'series',
    description: el.overview,
  };
}


function parseCast(credits, count) {
  if (!credits || !Array.isArray(credits.cast)) return [];
  const cast = credits.cast;
  const toParse = count === undefined || count === null ? cast : cast.slice(0, count);

  return toParse.map((el) => {
    let photoUrl = null;
    if (el.profile_path) {
      if (el.profile_path.startsWith('http')) {
        photoUrl = el.profile_path;
      } else {
        photoUrl = `https://image.tmdb.org/t/p/w276_and_h350_face${el.profile_path}`;
      }
    }
    return {
      name: el.name,
      character: el.character,
      photo: photoUrl
    };
  });
}

function parseDirector(credits) {
  if (!credits || !Array.isArray(credits.crew)) return [];
  return credits.crew.filter((x) => x.job === "Director").map((el) => el.name);
}

function parseWriter(credits) {
    if (!credits || !Array.isArray(credits.crew)) return [];
    const writers = credits.crew.filter((x) => x.department === "Writing").map((el) => el.name);
    const creators = credits.crew.filter((x) => x.job === "Creator").map((el) => el.name);
    return [...new Set([...writers, ...creators])];
}

function parseSlug(type, title, imdb_id) {
    return `${type}/${title.toLowerCase().replace(/ /g, "-")}-${imdb_id ? imdb_id.replace("tt", "") : ""}`;
}

function parseTrailers(videos) {
    if (!videos || !Array.isArray(videos.results)) return [];
    return videos.results
        .filter((el) => el.site === "YouTube" && el.type === "Trailer")
        .map((el) => ({ source: el.key, type: el.type, name: el.name, ytId: el.key }));
}

function parseTrailerStream(videos) {
    if (!videos || !Array.isArray(videos.results)) return [];
    return videos.results
        .filter((el) => el.site === "YouTube" && el.type === "Trailer")
        .map((el) => ({ title: el.name, ytId: el.key }));
}

function parseImdbLink(vote_average, imdb_id) {
  return {
    name: vote_average,
    category: "imdb",
    url: `https://imdb.com/title/${imdb_id}`,
  };
}

function parseShareLink(title, imdb_id, type) {
  return {
    name: "Share",
    category: "share",
    url: `https://www.strem.io/s/${type}/${imdb_id}/${encodeURIComponent(title)}`,
  };
}

function parseGenreLink(genres, type, language) {
  if (!Array.isArray(genres)) return [];
  return genres.map((genre) => ({
    name: genre.name,
    category: "Genres",
    url: `stremio:///discover/${type}/tmdb.top?genre=${encodeURIComponent(genre.name)}&language=${language}`,
  }));
}

function parseCreditsLink(credits, castCount) {
  const castData = parseCast(credits, castCount);
  const Cast = castData.map((actor) => ({
    name: actor.name, category: "Cast", url: `stremio:///search?search=${encodeURIComponent(actor.name)}`
  }));
  const Director = parseDirector(credits).map((director) => ({
    name: director, category: "Directors", url: `stremio:///search?search=${encodeURIComponent(director)}`,
  }));
  const Writer = parseWriter(credits).map((writer) => ({
    name: writer, category: "Writers", url: `stremio:///search?search=${encodeURIComponent(writer)}`,
  }));
  return [...Cast, ...Director, ...Writer];
}

function buildLinks(imdbRating, imdbId, title, type, genres, credits, language, castCount) {
  if (!imdbId) return [];
  return [
    parseImdbLink(imdbRating, imdbId),
    parseShareLink(title, imdbId, type),
    ...parseGenreLink(genres, type, language),
    ...parseCreditsLink(credits, castCount)
  ].filter(Boolean);
}

function parseCoutry(production_countries) {
  return production_countries?.map((country) => country.name).join(", ") || '';
}

function parseGenres(genres) {
  return genres?.map((el) => el.name) || [];
}

function parseYear(status, first_air_date, last_air_date) {
  const startYear = first_air_date ? first_air_date.substring(0, 4) : '';
  if (status === "Ended" && last_air_date) {
    const endYear = last_air_date.substring(0, 4);
    return startYear === endYear ? startYear : `${startYear}-${endYear}`;
  }
  return startYear;
}

function parseRunTime(runtime) {
  if (!runtime) return "";
  const hours = Math.floor(runtime / 60);
  const minutes = runtime % 60;
  if (runtime >= 60) {
    return hours > 0 ? `${hours}h${minutes > 0 ? `${minutes}min` : ''}` : `${minutes}min`;
  }
  return `${runtime}min`;
}

function parseCreatedBy(created_by) {
  return created_by?.map((el) => el.name).join(', ') || '';
}

function parseConfig(catalogChoices) {
  if (!catalogChoices) return {};
  try {
    return JSON.parse(decompressFromEncodedURIComponent(catalogChoices));
  } catch (e) {
    try { return JSON.parse(catalogChoices); } catch { return {}; }
  }
}

function getRpdbPoster(type, ids, language, rpdbkey) {
    const lang = language.split("-")[0];
    const { tmdbId, tvdbId } = ids;
    if (type === 'movie' && tmdbId) {
        return `https://api.ratingposterdb.com/${rpdbkey}/tmdb/poster-default/movie-${tmdbId}.jpg?fallback=true&lang=${lang}`;
    }
    if (type === 'series' && tvdbId) {
        return `https://api.ratingposterdb.com/${rpdbkey}/tvdb/poster-default/series-${tvdbId}.jpg?fallback=true&lang=${lang}`;
    }
    if (type === 'series' && tmdbId) {
        return `https://api.ratingposterdb.com/${rpdbkey}/tmdb/poster-default/series-${tmdbId}.jpg?fallback=true&lang=${lang}`;
    }
    return null; 
}

async function checkIfExists(url) {
  try { await axios.head(url); return true; } catch (error) { return false; }
}

async function parsePoster(type, ids, fallbackPosterPath, language, rpdbkey) {
  const { tmdbId, tvdbId } = ids;
  const fallbackImage = `https://image.tmdb.org/t/p/w500${fallbackPosterPath}`;

  if (rpdbkey) {
    const rpdbImage = getRpdbPoster(type, { tmdbId, tvdbId }, language, rpdbkey);
    if (rpdbImage && await checkIfExists(rpdbImage)) {
      return rpdbImage;
    }
  }
  return fallbackImage;
}

module.exports = {
  parseMedia, 
  parseCast,
  parseDirector,
  parseWriter,
  parseSlug,
  parseTrailers,
  parseTrailerStream,
  parseImdbLink,
  parseShareLink,
  parseGenreLink,
  parseCreditsLink,
  buildLinks,
  parseCoutry,
  parseGenres,
  parseYear,
  parseRunTime,
  parseCreatedBy,
  parseConfig,
  parsePoster,
  getRpdbPoster,
  checkIfExists,
};
