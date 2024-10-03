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
  const announceImdbPrefix = config.announce_imdb_prefix === "true";
  const translatedCatalogs = loadTranslations(language);
  const years = generateArrayOfYears(20);
  const genres_movie = await getGenreList(language, "movie").then((genres) => genres.map((el) => el.name).sort());
  const genres_series = await getGenreList(language, "series").then((genres) => genres.map((el) => el.name).sort());
  const languagesArray = await getLanguages();
  const filterLanguages = setOrderLanguage(language, languagesArray);
  const descriptionSuffix = language && language !== DEFAULT_LANGUAGE ? ` with ${language} language.` : ".";

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
    idPrefixes: announceImdbPrefix ? ["tmdb:", "tt"] : ["tmdb:"],
    behaviorHints: {
      configurable: true,
      configurationRequired: false,
    },
    catalogs: [
      {
        id: "tmdb.top",
        type: "movie",
        name: `${usePrefix ? "TMDB - " : ""}${translatedCatalogs.popular}`,
        pageSize: 20,
        extra: [
          { name: "genre", options: genres_movie },
          { name: "skip" },
          { name: "search" },
        ],
        extraSupported: ["genre", "skip", "search"],
      },
      {
        id: "tmdb.year",
        type: "movie",
        name: `${usePrefix ? "TMDB - " : ""}${translatedCatalogs.year}`,
        pageSize: 20,
        extra: [
          { name: "genre", options: years, isRequired: true },
          { name: "skip" },
        ],
        extraSupported: ["genre", "skip"],
        extraRequired: ["genre"],
      },
      {
        id: "tmdb.language",
        type: "movie",
        name: `${usePrefix ? "TMDB - " : ""}${translatedCatalogs.language}`,
        pageSize: 20,
        extra: [
          {
            name: "genre",
            options: filterLanguages,
            isRequired: true,
          },
          { name: "skip" },
        ],
        extraSupported: ["genre", "skip"],
        extraRequired: ["genre"],
      },
      {
        id: "tmdb.trending",
        type: "movie",
        name: `${usePrefix ? "TMDB - " : ""}${translatedCatalogs.trending}`,
        pageSize: 20,
        extra: [
          { name: "genre", options: ["Day", "Week"], isRequired: true },
          { name: "skip" },
        ],
        extraSupported: ["genre", "skip"],
        extraRequired: ["genre"],
      },
      {
        id: "tmdb.top",
        type: "series",
        name: `${usePrefix ? "TMDB - " : ""}${translatedCatalogs.popular}`,
        pageSize: 20,
        extra: [
          { name: "genre", options: genres_series },
          { name: "skip" },
          { name: "search" },
        ],
        extraSupported: ["genre", "skip", "search"],
      },
      {
        id: "tmdb.year",
        type: "series",
        name: `${usePrefix ? "TMDB - " : ""}${translatedCatalogs.year}`,
        pageSize: 20,
        extra: [
          { name: "genre", options: years, isRequired: true },
          { name: "skip" },
        ],
        extraSupported: ["genre", "skip"],
        extraRequired: ["genre"],
      },
      {
        id: "tmdb.language",
        type: "series",
        name: `${usePrefix ? "TMDB - " : ""}${translatedCatalogs.language}`,
        pageSize: 20,
        extra: [
          {
            name: "genre",
            options: filterLanguages,
            isRequired: true,
          },
          { name: "skip" },
        ],
        extraSupported: ["genre", "skip"],
        extraRequired: ["genre"],
      },
      {
        id: "tmdb.trending",
        type: "series",
        name: `${usePrefix ? "TMDB - " : ""}${translatedCatalogs.trending}`,
        pageSize: 20,
        extra: [
          { name: "genre", options: ["Day", "Week"], isRequired: true },
          { name: "skip" },
        ],
        extraSupported: ["genre", "skip"],
        extraRequired: ["genre"],
      }
    ],
  };
}

module.exports = { getManifest, DEFAULT_LANGUAGE };
