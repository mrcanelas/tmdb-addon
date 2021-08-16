require("dotenv").config();
const { getGenreList } = require("./getGenreList");

const DEFAULT_LANGUAGE = "en-US";

function generateArrayOfYears() {
  var max = new Date().getFullYear();
  var min = max - 20;
  var years = [];

  for (var i = max; i >= min; i--) {
    years.push(i);
  }
  return years;
}
const years = generateArrayOfYears();

async function getManifest(language = DEFAULT_LANGUAGE) {
  const genres_movie = await getGenreList(language, "movie");
  const genres_series = await getGenreList(language, "series");
  const descriptionSuffix =
    language && language !== DEFAULT_LANGUAGE
      ? ` with ${language} language.`
      : ".";
  return {
    id: "tmdb.addon",
    version: "2.0.3",
    icon: "https://i.imgur.com/P8SAWo5.png",
    background: "https://i.imgur.com/1lm1XaK.png",
    name: "The Movie Database Addon",
    description: "TMDB API for Stremio" + descriptionSuffix,
    resources: ["catalog", "meta"],
    types: ["movie", "series"],
    idPrefixes: ["tmdb:"],
    behaviorHints: {
      configurable: true,
      configurationRequired: false,
    },
    catalogs: [
      {
        type: "movie",
        id: "movie.top",
        name: "TMDB - Top",
        extraSupported: ["search", "genre", "skip"],
        genres: genres_movie
          .map((el) => {
            return el.name;
          })
          .sort(),
      },
      {
        type: "movie",
        id: "movie.year",
        name: "TMDB - By Year",
        extraSupported: ["genre", "skip"],
        extraRequired: ["genre"],
        extra: [
          {
            name: "genre",
            options: years,
            isRequired: true,
          },
        ],
      },
      {
        type: "series",
        id: "series.top",
        name: "TMDB - Top",
        extraSupported: ["search", "genre", "skip"],
        genres: genres_series
          .map((el) => {
            return el.name;
          })
          .sort(),
      },
      {
        type: "series",
        id: "series.year",
        name: "TMDB - By Year",
        extraSupported: ["genre", "skip"],
        extraRequired: ["genre"],
        extra: [
          {
            name: "genre",
            options: years,
            isRequired: true,
          },
        ],
      },
    ],
  };
}

module.exports = { getManifest, DEFAULT_LANGUAGE };
