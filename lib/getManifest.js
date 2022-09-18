require("dotenv").config();
const { getGenreList } = require("./getGenreList");
const { getLanguages } = require("./getLanguages");
const package = require("../package.json");

const DEFAULT_LANGUAGE = "en-US";

function generateArrayOfYears() {
  var max = new Date().getFullYear();
  var min = max - 20;
  var years = [];

  for (var i = max; i >= min; i--) {
    years.push(i.toString());
  }
  return years;
}
const years = generateArrayOfYears();

async function getManifest(language = DEFAULT_LANGUAGE) {
  const genres_movie = await getGenreList(language, "movie").then((genres) => genres.map((el) => el.name).sort()  );
  const genres_series = await getGenreList(language, "series").then((genres) => genres.map((el) => el.name).sort()  );
  const languages = await getLanguages();
  const filterLanguages = [...new Set(languages.map((el) => el.name).sort())];
  const descriptionSuffix = language && language !== DEFAULT_LANGUAGE ? ` with ${language} language.` : ".";

  return {
    id: package.name,
    version: package.version,
    favicon:
      "https://github.com/mrcanelas/tmdb-addon/raw/main/images/favicon.png",
    logo: "https://github.com/mrcanelas/tmdb-addon/raw/main/images/logo.png",
    background:
      "https://github.com/mrcanelas/tmdb-addon/raw/main/images/background.png",
    name: "The Movie Database Addon",
    description: package.description + descriptionSuffix,
    resources: ["catalog", "meta"],
    types: ["movie", "series"],
    idPrefixes: ["tmdb:"],
    behaviorHints: {
      configurable: true,
      configurationRequired: false,
    },
    catalogs: [
      {
        id: "tmdb.top",
        type: "movie",
        name: "TMDB - Popular",
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
        name: "TMDB - By Year",
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
        name: "TMDB - By Language",
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
        name: "TMDB - Trending",
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
        name: "TMDB - Popular",
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
        name: "TMDB - By Year",
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
        name: "TMDB - By Language",
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
        name: "TMDB - Trending",
        pageSize: 20,
        extra: [
          { name: "genre", options: ["Day", "Week"], isRequired: true },
          { name: "skip" },
        ],
        extraSupported: ["genre", "skip"],
        extraRequired: ["genre"],
      },
    ],
  };
}

module.exports = { getManifest, DEFAULT_LANGUAGE };
