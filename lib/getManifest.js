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

  function createCatalog(id, type, nameKey, options, extraRequired = []) {
    return {
      id,
      type,
      name: `${usePrefix ? "TMDB - " : ""}${translatedCatalogs[nameKey]}`,
      pageSize: 20,
      extra: [
        { name: "genre", options, isRequired: extraRequired.includes("genre") },
        { name: "skip" },
        ...(extraRequired.includes("search") ? [{ name: "search" }] : [])
      ],
      extraSupported: ["genre", "skip", ...(extraRequired.includes("search") ? ["search"] : [])],
      ...(extraRequired.length > 0 && { extraRequired })
    };
  }

  const catalogs = [
    createCatalog("tmdb.top", "movie", "popular", genres_movie, ["search"]),
    createCatalog("tmdb.year", "movie", "year", years, ["genre"]),
    createCatalog("tmdb.language", "movie", "language", filterLanguages, ["genre"]),
    createCatalog("tmdb.trending", "movie", "trending", ["Day", "Week"], ["genre"]),
    ...(sessionId ? [
      createCatalog("tmdb.favorites", "movie", "favorites"),
      createCatalog("tmdb.watchlist", "movie", "watchlist")
    ] : []),
    createCatalog("tmdb.top", "series", "popular", genres_series, ["search"]),
    createCatalog("tmdb.year", "series", "year", years, ["genre"]),
    createCatalog("tmdb.language", "series", "language", filterLanguages, ["genre"]),
    createCatalog("tmdb.trending", "series", "trending", ["Day", "Week"], ["genre"]),
    ...(sessionId ? [
      createCatalog("tmdb.favorites", "series", "favorites"),
      createCatalog("tmdb.watchlist", "series", "watchlist")
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
