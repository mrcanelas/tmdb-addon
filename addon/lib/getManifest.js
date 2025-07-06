require("dotenv").config();
const { getGenreList } = require("./getGenreList");
const { getLanguages } = require("./getLanguages");
const { getGenresFromMDBList } = require("../utils/mdbList");
const packageJson = require("../../package.json");
const catalogsTranslations = require("../static/translations.json");
const CATALOG_TYPES = require("../static/catalog-types.json");
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
  const defaultTranslations = catalogsTranslations[DEFAULT_LANGUAGE] || {};
  const selectedTranslations = catalogsTranslations[language] || {};

  return { ...defaultTranslations, ...selectedTranslations };
}

function createCatalog(id, type, catalogDef, options, tmdbPrefix, translatedCatalogs, showInHome = false) {
  const extra = [];

  if (catalogDef.extraSupported.includes("genre")) {
    if (catalogDef.defaultOptions) {
      const formattedOptions = catalogDef.defaultOptions.map(option => {
        if (option.includes('.')) {
          const [field, order] = option.split('.');
          if (translatedCatalogs[field] && translatedCatalogs[order]) {
            return `${translatedCatalogs[field]} (${translatedCatalogs[order]})`;
          }
          return option;
        }
        return translatedCatalogs[option] || option;
      });
      extra.push({ name: "genre", options: formattedOptions, isRequired: showInHome ? false : true });
    } else {
      extra.push({ name: "genre", options, isRequired: showInHome ? false : true });
    }
  }
  if (catalogDef.extraSupported.includes("search")) {
    extra.push({ name: "search" });
  }
  if (catalogDef.extraSupported.includes("skip")) {
    extra.push({ name: "skip" });
  }

  return {
    id,
    type,
    name: `${tmdbPrefix ? "TMDB - " : ""}${translatedCatalogs[catalogDef.nameKey]}`,
    pageSize: 20,
    extra
  };
}

function getCatalogDefinition(catalogId) {
  const [provider, type] = catalogId.split('.');

  for (const category of Object.keys(CATALOG_TYPES)) {
    if (CATALOG_TYPES[category][type]) {
      return CATALOG_TYPES[category][type];
    }
  }

  return null;
}

function getOptionsForCatalog(catalogDef, type, showInHome, { years, genres_movie, genres_series, filterLanguages }) {
  if (catalogDef.defaultOptions) return catalogDef.defaultOptions;

  const movieGenres = showInHome ? [...genres_movie] : ["Top", ...genres_movie];
  const seriesGenres = showInHome ? [...genres_series] : ["Top", ...genres_series];

  switch (catalogDef.nameKey) {
    case 'year':
      return years;
    case 'language':
      return filterLanguages;
    case 'popular':
      return type === 'movie' ? movieGenres : seriesGenres;
    default:
      return type === 'movie' ? movieGenres : seriesGenres;
  }
}

async function createMDBListCatalog(userCatalog, mdblistKey) {
  const listId = userCatalog.id.split(".")[1];
  const genres = await getGenresFromMDBList(listId, mdblistKey);

  return {
    id: userCatalog.id,
    type: userCatalog.type,
    name: userCatalog.name,
    pageSize: 20,
    extra: [
      { name: "genre", options: genres, isRequired: userCatalog.showInHome ? false : true },
      { name: "skip" },
    ],
  };
}

async function getManifest(config) {
  const language = config.language || DEFAULT_LANGUAGE;
  const tmdbPrefix = config.tmdbPrefix === "true";
  const provideImdbId = config.provideImdbId === "true";
  const sessionId = config.sessionId;
  const userCatalogs = config.catalogs || getDefaultCatalogs();
  const translatedCatalogs = loadTranslations(language);

  const stremioAddonsConfig = {
    issuer: "https://stremio-addons.net",
    signature: "eyJhbGciOiJkaXIiLCJlbmMiOiJBMTI4Q0JDLUhTMjU2In0..DTiTHmYyIbuTMPJB35cqsw.S2C6xuCL9OoHJbtX97v-2w3IM4iFqr2Qy4xRRlvyzIY2fZAcwmm6JUMdsc2LSTigIPQeGPomaqX53ECt23cJKuH-IKs4hHLH4sLYRZNL_VC0YefQNrWjMRZ75Yz-bVx3.DJZBtIb1bOCq6Z62AMUGvw"
  }

  const years = generateArrayOfYears(20);
  const genres_movie = await getGenreList(language, "movie").then(genres => {
    const sortedGenres = genres.map(el => el.name).sort();
    return sortedGenres;
  });

  const genres_series = await getGenreList(language, "series").then(genres => {
    const sortedGenres = genres.map(el => el.name).sort();
    return sortedGenres;
  });

  const languagesArray = await getLanguages();
  const filterLanguages = setOrderLanguage(language, languagesArray);
  const isMDBList = (id) => id.startsWith("mdblist.");
  const options = { years, genres_movie, genres_series, filterLanguages };

  let catalogs = await Promise.all(userCatalogs
    .filter(userCatalog => {
      const catalogDef = getCatalogDefinition(userCatalog.id);
      if (isMDBList(userCatalog.id)) return true;
      if (!catalogDef) return false;
      if (catalogDef.requiresAuth && !sessionId) return false;
      return true;
    })
    .map(userCatalog => {
      if (isMDBList(userCatalog.id)) {
        return createMDBListCatalog(userCatalog, config.mdblistkey);
      }
      const catalogDef = getCatalogDefinition(userCatalog.id);
      const catalogOptions = getOptionsForCatalog(catalogDef, userCatalog.type, userCatalog.showInHome, options);

      return createCatalog(
        userCatalog.id,
        userCatalog.type,
        catalogDef,
        catalogOptions,
        tmdbPrefix,
        translatedCatalogs,
        userCatalog.showInHome
      );
    }));

  if (config.searchEnabled !== "false") {
    const searchCatalogMovie = {
      id: "tmdb.search",
      type: "movie",
      name: `${tmdbPrefix ? "TMDB - " : ""}${translatedCatalogs.search}`,
      extra: [{ name: "search", isRequired: true, options: [] }]
    };

    const searchCatalogSeries = {
      id: "tmdb.search",
      type: "series",
      name: `${tmdbPrefix ? "TMDB - " : ""}${translatedCatalogs.search}`,
      extra: [{ name: "search", isRequired: true, options: [] }]
    };

    catalogs = [...catalogs, searchCatalogMovie, searchCatalogSeries];
  }

  if (config.geminikey) {
    const aiSearchCatalogMovie = {
      id: "tmdb.aisearch",
      type: "movie",
      name: `${tmdbPrefix ? "TMDB - " : ""}AI Search`,
      extra: [{ name: "search", isRequired: true, options: [] }]
    };

    const aiSearchCatalogSeries = {
      id: "tmdb.aisearch",
      type: "series",
      name: `${tmdbPrefix ? "TMDB - " : ""}AI Search`,
      extra: [{ name: "search", isRequired: true, options: [] }]
    };

    catalogs = [...catalogs, aiSearchCatalogMovie, aiSearchCatalogSeries];
  }

  const activeConfigs = [
    `Language: ${language}`,
    `TMDB Account: ${sessionId ? 'Connected' : 'Not Connected'}`,
    `MDBList Integration: ${config.mdblistkey ? 'Connected' : 'Not Connected'}`,
    `IMDb Integration: ${provideImdbId ? 'Enabled' : 'Disabled'}`,
    `RPDB Integration: ${config.rpdbkey ? 'Enabled' : 'Disabled'}`,
    `Search: ${config.searchEnabled !== "false" ? 'Enabled' : 'Disabled'}`,
    `Active Catalogs: ${catalogs.length}`
  ].join(' | ');

  return {
    id: packageJson.name,
    version: packageJson.version,
    favicon: `${process.env.HOST_NAME}/favicon.png`,
    logo: `${process.env.HOST_NAME}/logo.png`,
    background: `${process.env.HOST_NAME}/background.png`,
    name: "TMDB | Omni",
    description: "Fork of the TMDB addon for use with Omni (https://omni.stkc.win). Current settings: " + activeConfigs,
    resources: ["catalog", "meta"],
    types: ["movie", "series"],
    idPrefixes: provideImdbId ? ["tmdb:", "tt"] : ["tmdb:"],
    stremioAddonsConfig,
    behaviorHints: {
      configurable: true,
      configurationRequired: false,
    },
    catalogs,
  };
}

function getDefaultCatalogs() {
  const defaultTypes = ['movie', 'series'];
  const defaultCatalogs = Object.keys(CATALOG_TYPES.default);

  return defaultCatalogs.flatMap(id =>
    defaultTypes.map(type => ({
      id: `tmdb.${id}`,
      type,
      showInHome: true
    }))
  );
}

module.exports = { getManifest, DEFAULT_LANGUAGE };