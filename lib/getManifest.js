require("dotenv").config();
const { getGenreList } = require("./getGenreList");
const { getLanguages } = require("./getLanguages");
const package = require("../package.json");
const catalogsTranslations = require("../static/translations.json");
const DEFAULT_LANGUAGE = "en-US";

function generateArrayOfYears(maxYears) {
  const max = new Date().getFullYear();
  const min = max - maxYears;
  const years = [];
  for (let i = max; i >= min; i--) {
    years.push(i.toString());
  }
  return years;
}

function setOrderLanguage(language, languagesArray) {
  const languageObj = languagesArray.find((lang) => lang.iso_639_1 === language);
  const fromIndex = languagesArray.indexOf(languageObj);
  const element = languagesArray.splice(fromIndex, 1)[0];
  languagesArray = languagesArray.sort((a, b) => (a.name > b.name ? 1 : -1));
  languagesArray.splice(0, 0, element);
  return [...new Set(languagesArray.map((el) => el.name))];
}

function loadTranslations(language) {
  return catalogsTranslations[language] || catalogsTranslations[DEFAULT_LANGUAGE];
}

async function getManifest(config) {
  const language = config.language || DEFAULT_LANGUAGE;
  const usePrefix = config.use_tmdb_prefix === "true";
  const provideImdbId = config.provide_imdbId === "true";
  const sessionId = config.sessionId
  const translatedCatalogs = loadTranslations(language);
  const years = generateArrayOfYears(20);
  const genres_movie = await getGenreList(language, "movie").then((genres) => genres.map((el) => el.name).sort());
  const genres_series = await getGenreList(language, "series").then((genres) => genres.map((el) => el.name).sort());
  const languagesArray = await getLanguages();
  const filterLanguages = setOrderLanguage(language, languagesArray);
  const descriptionSuffix = language && language !== DEFAULT_LANGUAGE ? ` with ${language} language.` : ".";

  function createCatalog(id, type, nameKey, options, extraSupported = [], extraRequired = []) {
    const extra = [];

    if (extraSupported.includes("genre")) {
      extra.push({ name: "genre", options, ...(extraRequired.includes("genre") ? { isRequired: true } : {}) });
    }
    if (extraSupported.includes("search")) {
      extra.push({ name: "search" });
    }
    if (extraSupported.includes("skip")) {
      extra.push({ name: "skip" });
    }

    return {
      id,
      type,
      name: `${usePrefix ? "TMDB - " : ""}${translatedCatalogs[nameKey]}`,
      pageSize: 20,
      extra,
      extraSupported,
      ...(extraRequired.length > 0 && { extraRequired })
    };
  }

  const catalogs = [
    createCatalog("tmdb.top", "movie", "popular", genres_movie, ["genre", "skip", "search"]),
    createCatalog("tmdb.year", "movie", "year", years, ["genre", "skip"], ["genre"]),
    createCatalog("tmdb.language", "movie", "language", filterLanguages, ["genre", "skip"], ["genre"]),
    createCatalog("tmdb.trending", "movie", "trending", ["Day", "Week"], ["genre", "skip"], ["genre"]),
    ...(sessionId ? [
      createCatalog("tmdb.favorites", "movie", "favorites", ["Top"], ["genre", "skip"], ["genre"]),
      createCatalog("tmdb.watchlist", "movie", "watchlist", ["Top"], ["genre", "skip"], ["genre"])
    ] : []),
    createCatalog("tmdb.top", "series", "popular", genres_series, ["genre", "skip", "search"]),
    createCatalog("tmdb.year", "series", "year", years, ["genre", "skip"], ["genre"]),
    createCatalog("tmdb.language", "series", "language", filterLanguages, ["genre", "skip"], ["genre"]),
    createCatalog("tmdb.trending", "series", "trending", ["Day", "Week"], ["genre", "skip"], ["genre"]),
    ...(sessionId ? [
      createCatalog("tmdb.favorites", "series", "favorites", ["Top"], ["genre", "skip"], ["genre"]),
      createCatalog("tmdb.watchlist", "series", "watchlist", ["Top"], ["genre", "skip"], ["genre"])
    ] : [])
  ];

  return {
    id: package.name,
    version: package.version,
    favicon: "https://github.com/mrcanelas/tmdb-addon/raw/main/images/favicon.png",
    logo: "https://github.com/mrcanelas/tmdb-addon/raw/main/images/logo.png",
    background: "https://github.com/mrcanelas/tmdb-addon/raw/main/images/background.png",
    name: "The Movie Database Addon",
    description: package.description + descriptionSuffix,
    resources: ["catalog", "meta"],
    types: ["movie", "series"],
    idPrefixes: provideImdbId ? ["tmdb:", "tt"] : ["tmdb:"],
    behaviorHints: {
      configurable: true,
      configurationRequired: false,
    },
    catalogs,
  };
}

module.exports = { getManifest, DEFAULT_LANGUAGE };
