require("dotenv").config();
const { getGenreList } = require("./getGenreList");
const package = require("../package.json")

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
  const genres_movie = await getGenreList(language, "movie").then(genres => genres.map((el) => el.name).sort());
  const genres_series = await getGenreList(language, "series").then(genres => genres.map((el) => el.name).sort());
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
          { name: "genre", options: genres_movie }, { name: "skip" }, { name: "search" }
        ],
        genres: genres_movie,
        extraSupported: ["genre", "skip", "search"],
      },
      {
        id: "tmdb.year",
        type: "movie",
        name: "TMDB - New",
        pageSize: 20,
        extra: [
          { name: "genre", options: years, isRequired: true }, { name: "skip" }
        ],
        genres: years,
        extraSupported: ["genre", "skip"],
        extraRequired: ["genre"],
      },
      {
        id: "tmdb.top",
        type: "series",
        name: "TMDB - Popular",
        pageSize: 20,
        extra: [
          { name: "genre", options: genres_series }, { name: "skip" }, { name: "search" }
        ],
        genres: genres_series,
        extraSupported: ["genre", "skip", "search"],
      },
      {
        id: "tmdb.year",
        type: "series",
        name: "TMDB - New",
        pageSize: 20,
        extra: [
          { name: "genre", options: years, isRequired: true }, { name: "skip" }
        ],
        genres: years,
        extraSupported: ["genre", "skip"],
        extraRequired: ["genre"],
      },
    ],
  };
}

module.exports = { getManifest, DEFAULT_LANGUAGE };