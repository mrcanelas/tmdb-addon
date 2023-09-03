function parseCertification({results}, language) {
  return results.filter(
    ({iso_3166_1}) => iso_3166_1 == language.split("-")[1]
  )[0].release_dates[0].certification;
}

function parseCast({cast}) {
  return cast.slice(0, 4).map(({name}) => name);
}

function parseDirector({crew}) {
  return crew
    .filter(({job}) => job === "Director")
    .map(({name}) => name);
}

function parseWriter({crew}) {
  return crew
    .filter(({job}) => job === "Writer")
    .map(({name}) => name);
}

function parseSlug(type, title, imdb_id) {
  return `${type}/${title.toLowerCase().replace(/ /g, "-")}-${
    imdb_id ? imdb_id.replace("tt", "") : ""
  }`;
}

function parseTrailers({results}) {
  return results
    .filter(({site}) => site === "YouTube")
    .filter(({type}) => type === "Trailer")
    .map(({key, type}) => ({
    source: `${key}`,
    type: `${type}`
  }));
}

function parseTrailerStream({results}) {
  return results
    .filter(({site}) => site === "YouTube")
    .filter(({type}) => type === "Trailer")
    .map(({name, key}) => ({
    title: `${name}`,
    ytId: `${key}`
  }));
}

function parseImdbLink(vote_average, imdb_id) {
  return {
    name: vote_average.toFixed(1),
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

function parseGenreLink(genres, type, language) {
  return genres.map(({name}) => ({
    name,
    category: "Genres",

    url: `stremio:///discover/${encodeURIComponent(
      process.env.HOST_NAME
    )}%2F${language}%2Fmanifest.json/${type}/tmdb.top?genre=${encodeURIComponent(
      name
    )}`
  }));
}

function parseCreditsLink(credits) {
  const Cast = parseCast(credits).map(actor => ({
    name: actor,
    category: "Cast",
    url: `stremio:///search?search=${encodeURIComponent(actor)}`
  }));
  const Director = parseDirector(credits).map(director => ({
    name: director,
    category: "Directors",
    url: `stremio:///search?search=${encodeURIComponent(director)}`
  }));
  const Writer = parseWriter(credits).map(writer => ({
    name: writer,
    category: "Writers",
    url: `stremio:///search?search=${encodeURIComponent(writer)}`
  }));
  return new Array(...Cast, ...Director, ...Writer);
}

function parseCoutry(production_countries) {
  return production_countries.map(({name}) => name).join(", ");
}

function parseGenres(genres) {
  return genres.map(({name}) => name);
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
  if (runtime) {
    const hours = runtime / 60;
    const rhours = Math.floor(hours);
    const minutes = (hours - rhours) * 60;
    const rminutes = Math.round(minutes);
    return rhours > 0 ? `${rhours}h${rminutes}min` : `${rminutes}min`;
  }
}

function parseCreatedBy(created_by) {
  return created_by.map(({name}) => name);
}

function parseConfig(catalogChoices) {
  let config = {}
  try {
    config = JSON.parse(catalogChoices);
  } catch(e) {
    if (catalogChoices) {
      // reverse compatibility for old version of config
      config.language = catalogChoices;
    }
  }
  return config;
}

function getRpdbPoster(type, id, language, rpdbkey) {
  const tier = rpdbkey.split("-")[0]
  const lang = language.split("-")[0]
  if(tier === "t1" || lang === "en") {
    return `https://api.ratingposterdb.com/${rpdbkey}/tmdb/poster-default/${type}-${id}.jpg?fallback=true`
  } else {
    return `https://api.ratingposterdb.com/${rpdbkey}/tmdb/poster-default/${type}-${id}.jpg?fallback=true&lang=${lang}`
  }
}

export default {
  parseCertification,
  parseCast,
  parseDirector,
  parseSlug,
  parseWriter,
  parseTrailers,
  parseTrailerStream,
  parseImdbLink,
  parseShareLink,
  parseGenreLink,
  parseCreditsLink,
  parseCoutry,
  parseGenres,
  parseYear,
  parseRunTime,
  parseCreatedBy,
  parseConfig,
  getRpdbPoster,
};
