require("dotenv").config();
const { MovieDb } = require("moviedb-promise");
const moviedb = new MovieDb(process.env.TMDB_API);
const { getGenreList } = require("./getGenreList");
const { getLanguages } = require("./getLanguages");
const { getTrending } = require("./getTrending");
const { parseMedia } = require("../utils/parseProps");
const CATALOG_TYPES = require("../static/catalog-types.json");

async function getCatalog(type, language, page, id, genre) {
  if (id === "tmdb.top" && !genre) return await getTrending(type, language, page, "week");

  const genreList = await getGenreList(language, type);
  const parameters = await buildParameters(type, language, page, id, genre, genreList);

  const fetchFunction = type === "movie" ? moviedb.discoverMovie.bind(moviedb) : moviedb.discoverTv.bind(moviedb);

  return fetchFunction(parameters)
    .then((res) => ({
      metas: res.results.map(el => parseMedia(el, type, genreList))
    }))
    .catch(console.error);
}

async function buildParameters(type, language, page, id, genre, genreList) {
  const languages = await getLanguages();
  const parameters = { language, page, 'vote_count.gte': 100 };

  if (id.includes("streaming")) {
    parameters.with_genres = genre ? findGenreId(genre, genreList) : undefined;
    parameters.with_watch_providers = findWatchProviderId(id.split(".")[1]);
    parameters.watch_region = language.split("-")[1];
    parameters.with_watch_monetization_types = "flatrate";
    delete parameters["vote_count.gte"];
  } else {
    switch (id) {
      case "tmdb.top":
        parameters.with_genres = genre ? findGenreId(genre, genreList) : undefined;
        if (type === "tv") {
          parameters.watch_region = language.split("-")[1];
          parameters.with_watch_monetization_types = "flatrate|free|ads|rent|buy";
        }
        break;
      case "tmdb.year":
        parameters[type === "movie" ? "primary_release_year" : "first_air_date_year"] = genre;
        break;
      case "tmdb.language":
        parameters.with_original_language = findLanguageCode(genre, languages);
        break;
      default:
        break;
    }
  }
  return parameters;
}

function findGenreId(genre, genreList) {
  const genreData = genreList.find((x) => x.name === genre);
  if (!genreData) throw new Error(`Could not find genre: ${genre}`);
  return genreData.id;
}

function findLanguageCode(genre, languages) {
  const language = languages.find((lang) => lang.name === genre);
  return language ? language.iso_639_1.split("-")[0] : "";
}

function findWatchProviderId(catalogId) {
  const catalog = CATALOG_TYPES.streaming[catalogId];
  if (!catalog) throw new Error(`Could not find catalog: ${catalogId}`);
  return catalog.watchProviderId;
}

module.exports = { getCatalog };
