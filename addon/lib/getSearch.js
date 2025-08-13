require("dotenv").config();
const { TMDBClient } = require("../utils/tmdbClient");
const moviedb = new TMDBClient(process.env.TMDB_API);
const geminiService = require("../utils/gemini-service");
const { transliterate } = require("transliteration");
const { parseMedia } = require("../utils/parseProps");
const { getGenreList } = require("./getGenreList");

function isNonLatin(text) {
  return /[^\u0000-\u007F]/.test(text);
}

async function getSearch(id, type, language, query, config) {
  let searchQuery = query;
  if (isNonLatin(searchQuery)) {
    searchQuery = transliterate(searchQuery);
  }

  const isAISearch = id === "tmdb.aisearch";
  let searchResults = [];

  if (isAISearch && config.geminikey) {
    try {
      await geminiService.initialize(config.geminikey);
      
      const titles = await geminiService.searchWithAI(query, type);

      const genreList = await getGenreList(language, type);
      
      const searchPromises = titles.map(async (title) => {
        try {
          const parameters = {
            query: title,
            language,
            include_adult: config.includeAdult
          };

          if (type === "movie") {
            const res = await moviedb.searchMovie(parameters);
            if (res.results && res.results.length > 0) {
              return parseMedia(res.results[0], 'movie', genreList);
            }
          } else {
            const res = await moviedb.searchTv(parameters);
            if (res.results && res.results.length > 0) {
              return parseMedia(res.results[0], 'tv', genreList);
            }
          }
          return null;
        } catch (error) {
          console.error(`Error fetching details for title "${title}":`, error);
          return null;
        }
      });

      const results = await Promise.all(searchPromises);
      searchResults = results.filter(result => result !== null);

    } catch (error) {
      console.error('Error processing AI search:', error);
    }
  }

  if (searchResults.length === 0) {
    const genreList = await getGenreList(language, type);

    const parameters = {
      query: query,
      language,
      include_adult: config.includeAdult
    };

    if (config.ageRating) {
      parameters.certification_country = "US";
      switch(config.ageRating) {
        case "G":
          parameters.certification = type === "movie" ? "G" : "TV-G";
          break;
        case "PG":
          parameters.certification = type === "movie" ? ["G", "PG"].join("|") : ["TV-G", "TV-PG"].join("|");
          break;
        case "PG-13":
          parameters.certification = type === "movie" ? ["G", "PG", "PG-13"].join("|") : ["TV-G", "TV-PG", "TV-14"].join("|");
          break;
        case "R":
          parameters.certification = type === "movie" ? ["G", "PG", "PG-13", "R"].join("|") : ["TV-G", "TV-PG", "TV-14", "TV-MA"].join("|");
          break;
      }
    }

    if (type === "movie") {
      await moviedb
        .searchMovie(parameters)
        .then((res) => {
          res.results.map((el) => {searchResults.push(parseMedia(el, 'movie', genreList));});
        })
        .catch(console.error);

      if (searchResults.length === 0) {
        await moviedb
          .searchMovie({ query: searchQuery, language, include_adult: config.includeAdult })
          .then((res) => {
            res.results.map((el) => {searchResults.push(parseMedia(el, 'movie', genreList));});
          })
          .catch(console.error);
      }

      await moviedb.searchPerson({ query: query, language }).then(async (res) => {
        if (res.results[0]) {
          await moviedb
            .personMovieCredits({ id: res.results[0].id, language })
            .then((credits) => {
              credits.cast.map((el) => {
                if (!searchResults.find((meta) => meta.id === `tmdb:${el.id}`)) {
                  searchResults.push(parseMedia(el, 'movie', genreList));
                }
              });
              credits.crew.map((el) => {
                if (el.job === "Director" || el.job === "Writer") {
                  if (!searchResults.find((meta) => meta.id === `tmdb:${el.id}`)) {
                    searchResults.push(parseMedia(el, 'movie', genreList));
                  }
                }
              });
            });
        }
      });
    } else {
      await moviedb
        .searchTv(parameters)
        .then((res) => {
          res.results.map((el) => {searchResults.push(parseMedia(el, 'tv', genreList))});
        })
        .catch(console.error);

      if (searchResults.length === 0) {
        await moviedb
          .searchTv({ query: searchQuery, language, include_adult: config.includeAdult })
          .then((res) => {
            res.results.map((el) => {searchResults.push(parseMedia(el, 'tv', genreList))});
          })
          .catch(console.error);
      }

      await moviedb.searchPerson({ query: query, language }).then(async (res) => {
        if (res.results[0]) {
          await moviedb
            .personTvCredits({ id: res.results[0].id, language })
            .then((credits) => {
              credits.cast.map((el) => {
                if (el.episode_count >= 5) {
                  if (!searchResults.find((meta) => meta.id === `tmdb:${el.id}`)) {
                    searchResults.push(parseMedia(el, 'tv', genreList));
                  }
                }
              });
              credits.crew.map((el) => {
                if (el.job === "Director" || el.job === "Writer") {
                  if (!searchResults.find((meta) => meta.id === `tmdb:${el.id}`)) {
                    searchResults.push(parseMedia(el, 'tv', genreList));
                  }
                }
              });
            });
        }
      });
    }
  }

  return Promise.resolve({ query, metas: searchResults });
}

module.exports = { getSearch };
