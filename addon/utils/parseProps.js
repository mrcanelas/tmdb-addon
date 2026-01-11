const urlExists = require("url-exists");
const { decompressFromEncodedURIComponent } = require('lz-string');
const { get } = require("http");

function parseCertification(release_dates, language) {
  return release_dates.results.filter(
    (releases) => releases.iso_3166_1 == language.split("-")[1]
  )[0].release_dates[0].certification;
}

function parseCast(credits, count) {
  if (count === undefined || count === null) {
    return credits.cast.map((el) => {
      return {
        name: el.name,
        character: el.character,
        photo: el.profile_path ? `https://image.tmdb.org/t/p/w276_and_h350_face${el.profile_path}` : null
      };
    });
  }
  return credits.cast.slice(0, count).map((el) => {
    return {
      name: el.name,
      character: el.character,
      photo: el.profile_path ? `https://image.tmdb.org/t/p/w276_and_h350_face${el.profile_path}` : null
    };
  });
}

function parseDirector(credits) {
  return credits.crew
    .filter((x) => x.job === "Director")
    .map((el) => {
      return el.name;
    });
}

function parseWriter(credits) {
  return credits.crew
    .filter((x) => x.job === "Writer")
    .map((el) => {
      return el.name;
    });
}

function parseSlug(type, title, imdb_id) {
  return `${type}/${title.toLowerCase().replace(/ /g, "-")}-${imdb_id ? imdb_id.replace("tt", "") : ""
    }`;
}

function parseTrailers(videos) {
  return videos.results
    .filter((el) => el.site === "YouTube")
    .filter((el) => el.type === "Trailer")
    .map((el) => {
      return {
        source: `${el.key}`,
        type: `${el.type}`,
      };
    });
}

function parseTrailerStream(videos) {
  return videos.results
    .filter((el) => el.site === "YouTube")
    .filter((el) => el.type === "Trailer")
    .map((el) => {
      return {
        title: `${el.name}`,
        ytId: `${el.key}`,
      };
    });
}

function parseImdbLink(vote_average, imdb_id, ageRating = null, showAgeRatingWithImdbRating = false) {
  return {
    name: showAgeRatingWithImdbRating && ageRating ? `${ageRating}\u2003\u2003${vote_average}` : vote_average,
    category: "imdb",
    url: `https://imdb.com/title/${imdb_id}`,
  };
}

function parseShareLink(title, imdb_id, type) {
  return {
    name: title,
    category: "share",
    url: `https://www.strem.io/s/${parseSlug(type, title, imdb_id)}`,
  };
}

function parseImdbParentalGuideLink(imdbId, ageRating) {
  if (!imdbId || !ageRating) return null;

  return {
    name: ageRating,
    category: "Genres",
    url: `https://www.imdb.com/title/${imdbId}/parentalguide`
  };
}

function parseGenreLink(genres, type, language, imdbId = null, ageRating = null, showAgeRatingInGenres = true) {
  const genreLinks = genres.map((genre) => {
    return {
      name: genre.name,
      category: "Genres",
      url: `stremio:///discover/${encodeURIComponent(
        process.env.HOST_NAME
      )}%2F${language}%2Fmanifest.json/${type}/tmdb.top?genre=${encodeURIComponent(
        genre.name
      )}`,
    };
  });

  // Add IMDb parental guide link as first genre if available and enabled
  if (showAgeRatingInGenres) {
    const parentalGuideLink = parseImdbParentalGuideLink(imdbId, ageRating);
    if (parentalGuideLink) {
      return [parentalGuideLink, ...genreLinks];
    }
  }

  return genreLinks;
}

function parseCreditsLink(credits, castCount) {
  const castData = parseCast(credits, castCount);
  const Cast = castData.map((actor) => {
    return {
      name: actor.name,
      category: "Cast",
      url: `stremio:///search?search=${encodeURIComponent(actor.name)}`
    };
  });
  const Director = parseDirector(credits).map((director) => {
    return {
      name: director,
      category: "Directors",
      url: `stremio:///search?search=${encodeURIComponent(director)}`,
    };
  });
  const Writer = parseWriter(credits).map((writer) => {
    return {
      name: writer,
      category: "Writers",
      url: `stremio:///search?search=${encodeURIComponent(writer)}`,
    };
  });
  return new Array(...Cast, ...Director, ...Writer);
}

function parseCoutry(production_countries) {
  return production_countries.map((country) => country.name).join(", ");
}

function parseGenres(genres) {
  return genres.map((el) => {
    return el.name;
  });
}

function parseYear(status, first_air_date, last_air_date) {
  if (status === "Ended") {
    return first_air_date && last_air_date
      ? first_air_date.substr(0, 5) + last_air_date.substr(0, 4)
      : "";
  } else {
    return first_air_date ? first_air_date.substr(0, 5) : "";
  }
}

function parseRunTime(runtime) {
  if (runtime === 0 || !runtime) {
    return "";
  }

  const hours = Math.floor(runtime / 60);
  const minutes = runtime % 60;

  if (runtime > 60) {
    return hours > 0 ? `${hours}h${minutes}min` : `${minutes}min`;
  } else {
    return `${runtime}min`;
  }
}

function parseCreatedBy(created_by) {
  return created_by.map((el) => el.name);
}

function parseConfig(catalogChoices) {
  let config = {};

  // If catalogChoices is null, undefined or empty, return empty object
  if (!catalogChoices) {
    return config;
  }

  try {
    // Try to decompress with lz-string
    const decoded = decompressFromEncodedURIComponent(catalogChoices);
    config = JSON.parse(decoded);
  } catch (e) {
    try {
      config = JSON.parse(catalogChoices);
    } catch {
      if (catalogChoices) {
        config.language = catalogChoices;
      }
    }
  }
  return config;
}

async function parseMediaImage(type, id, imagePath, language, rpdbkey, mediaType = "poster", rpdbMediaTypes = null, topPostersKey = null) {
  // Determina o tamanho da imagem do TMDB baseado no tipo de mídia
  const tmdbSize = mediaType === "backdrop" || mediaType === "logo" ? "original" : "w500";
  const tmdbImage = `https://image.tmdb.org/t/p/${tmdbSize}${imagePath}`;

  // Verifica se o Top Posters está habilitado (prioridade sobre RPDB)
  if (topPostersKey && (mediaType === "poster" || mediaType === "backdrop")) {
    return getTopPosterMedia(type, id, language, topPostersKey, mediaType);
  }

  // Verifica se o RPDB está habilitado e se o tipo de mídia específico está habilitado
  if (rpdbkey && rpdbMediaTypes) {
    // Se rpdbMediaTypes está definido, verifica se o tipo específico está habilitado
    const isMediaTypeEnabled = rpdbMediaTypes[mediaType] === true ||
      (mediaType === "poster" && rpdbMediaTypes.poster !== false); // poster é padrão true
    if (isMediaTypeEnabled) {
      const rpdbImage = getRpdbMedia(type, id, language, rpdbkey, mediaType);
      return rpdbImage;
    }
  } else if (rpdbkey && !rpdbMediaTypes) {
    // Compatibilidade: se rpdbkey existe mas rpdbMediaTypes não, usa comportamento antigo (só poster)
    if (mediaType === "poster") {
      const rpdbImage = getRpdbMedia(type, id, language, rpdbkey, mediaType);
      return rpdbImage;
    }
  }
  return tmdbImage;
}

// Wrapper para compatibilidade com código existente
async function parsePoster(type, id, poster, language, rpdbkey, rpdbMediaTypes = null, topPostersKey = null) {
  return parseMediaImage(type, id, poster, language, rpdbkey, "poster", rpdbMediaTypes, topPostersKey);
}

// Função para obter poster do RPDB (usado em index.js)
function getRpdbPoster(type, id, language, rpdbkey, rpdbMediaTypes = null) {
  // Se rpdbMediaTypes está definido e poster não está habilitado, retorna null
  if (rpdbMediaTypes && rpdbMediaTypes.poster === false) {
    return null;
  }
  return getRpdbMedia(type, id, language, rpdbkey, "poster");
}

function parseMedia(el, type, genreList = []) {
  const genres = Array.isArray(el.genre_ids)
    ? el.genre_ids.map(genre => genreList.find((x) => x.id === genre)?.name || 'Unknown')
    : [];

  return {
    id: `tmdb:${el.id}`,
    name: type === 'movie' ? el.title : el.name,
    genre: genres,
    poster: `https://image.tmdb.org/t/p/w500${el.poster_path}`,
    background: `https://image.tmdb.org/t/p/original${el.backdrop_path}`,
    posterShape: "regular",
    imdbRating: el.vote_average ? el.vote_average.toFixed(1) : 'N/A',
    year: type === 'movie' ? (el.release_date ? el.release_date.substr(0, 4) : "") : (el.first_air_date ? el.first_air_date.substr(0, 4) : ""),
    type: type === 'movie' ? type : 'series',
    description: el.overview,
  };
}

function getRpdbMedia(type, id, language, rpdbkey, mediaType) {
  const tier = rpdbkey.split("-")[0]
  const fullLanguageCodes = ['pt-PT', 'pt-BR', 'es-ES', 'es-MX', 'zh-CN', 'zh-HK', 'zh-SG', 'zh-TW'];

  // Verifica se o idioma está no array de idiomas completos
  const lang = fullLanguageCodes.includes(language) ? language : language.split("-")[0];

  if (tier === "t0" || tier === "t1" || lang === "en") {
    return `https://api.ratingposterdb.com/${rpdbkey}/tmdb/${mediaType}-default/${type}-${id}.png?fallback=true`
  } else {
    return `https://api.ratingposterdb.com/${rpdbkey}/tmdb/${mediaType}-default/${type}-${id}.png?fallback=true&lang=${lang}`
  }
}

// Função para obter poster do Top Posters
function getTopPosterMedia(type, id, language, topPostersKey, mediaType) {
  const mediaId = type === 'movie' ? `movie-${id}` : `series-${id}`;
  const posterType = mediaType === 'backdrop' ? 'backdrop-default' : 'poster-default';
  const fullLanguageCodes = ['pt-PT', 'pt-BR', 'es-ES', 'es-MX', 'zh-CN', 'zh-HK', 'zh-SG', 'zh-TW', 'it-IT', 'de-DE', 'fr-FR'];
  const lang = fullLanguageCodes.includes(language) ? language : language.split("-")[0];
  const tmdbImage = `https://image.tmdb.org/t/p/${mediaType === 'backdrop' ? 'original' : 'w500'}`;

  // Add fallback_url to redirect to TMDB image if Top Posters fails
  return `https://api.top-streaming.stream/${topPostersKey}/tmdb/${posterType}/${mediaId}.jpg?lang=${lang}&fallback_url=${encodeURIComponent(tmdbImage)}`;
}

// Função para obter poster do Top Posters (usado em index.js)
function getTopPosterPoster(type, id, language, topPostersKey) {
  return getTopPosterMedia(type, id, language, topPostersKey, "poster");
}

function parseCollection(collObj) {
  if (!collObj || !collObj.parts || collObj.parts.length === 0) {
    return [];
  }
  return collObj.parts.map((el) => {
    return {
      name: el.title, //the link has the name of the entry
      category: collObj.name, //groups the buttons/links under the collection's name
      url: `stremio:///detail/${el.media_type}/tmdb:${el.id}` //would open the detail page for the related entry when clicked
    };
  });
}

module.exports = {
  parseCertification,
  parseCast,
  parseDirector,
  parseSlug,
  parseWriter,
  parseTrailers,
  parseTrailerStream,
  parseImdbLink,
  parseShareLink,
  parseImdbParentalGuideLink,
  parseGenreLink,
  parseCreditsLink,
  parseCoutry,
  parseGenres,
  parseYear,
  parseRunTime,
  parseCreatedBy,
  parseConfig,
  parsePoster,
  parseMediaImage,
  parseMedia,
  getRpdbMedia,
  getRpdbPoster,
  getTopPosterMedia,
  getTopPosterPoster,
  parseCollection
};
