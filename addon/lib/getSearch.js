require("dotenv").config();
const { MovieDb } = require("moviedb-promise");
const { getGenreList } = require("./getGenreList");
const { parseMedia } = require("../utils/parseProps");
const tvdb = require("./tvdb");
const { to3LetterCode } = require("./language-map"); 

const moviedb = new MovieDb(process.env.TMDB_API);

function sanitizeQuery(query) {
  if (!query) return '';
  return query.replace(/[\[\]()!?]/g, ' ').replace(/[:.-]/g, ' ').trim().replace(/\s\s+/g, ' ');
}



async function parseTvdbSearchResult(extendedRecord, language) {
  if (!extendedRecord || !extendedRecord.id || !extendedRecord.name) return null;

  const langCode = language.split('-')[0];
  const langCode3 = await to3LetterCode(langCode);
  
  const nameTranslations = extendedRecord.translations?.nameTranslations || [];
  const translatedName = nameTranslations.find(t => t.language === langCode3)?.name
                       || nameTranslations.find(t => t.language === 'eng')?.name
                       || extendedRecord.name;

  return {
    id: `tvdb:${extendedRecord.id}`,
    type: 'series',
    name: translatedName, 
    poster: extendedRecord.image,
    year: extendedRecord.year,
    description: extendedRecord.overview,
  };
}

async function performMovieSearch(query, language, config, genreList) {
    const searchResults = new Map();
    const addResult = (media) => {
        const parsed = parseMedia(media, 'movie', genreList);
        if (parsed && !searchResults.has(parsed.id)) searchResults.set(parsed.id, parsed);
    };
    const movieRes = await moviedb.searchMovie({ query, language, include_adult: config.includeAdult });
    movieRes.results.forEach(addResult);
    const personRes = await moviedb.searchPerson({ query, language });
    if (personRes.results?.[0]) {
        const credits = await moviedb.personMovieCredits({ id: personRes.results[0].id, language });
        credits.cast.forEach(addResult);
        credits.crew.forEach(media => { if (media.job === "Director" || media.job === "Writer") addResult(media); });
    }
    return Array.from(searchResults.values());
}

async function performSeriesSearch(query, language) {
  const sanitizedQuery = sanitizeQuery(query);
  if (!sanitizedQuery) return [];

  const [titleResults, peopleResults] = await Promise.all([
    tvdb.searchSeries(sanitizedQuery),
    tvdb.searchPeople(sanitizedQuery)
  ]);

  const seriesIdMap = new Map();

  
  titleResults.forEach(result => {
    if (result.tvdb_id) seriesIdMap.set(result.tvdb_id, true);
  });

  
  if (peopleResults.length > 0) {
    const topPerson = peopleResults[0];
    const personDetails = await tvdb.getPersonExtended(topPerson.tvdb_id);
    if (personDetails && personDetails.characters) {
      personDetails.characters.forEach(credit => {
        if (credit.seriesId) seriesIdMap.set(String(credit.seriesId), true);
      });
    }
  }

  const uniqueIds = Array.from(seriesIdMap.keys());
  if (uniqueIds.length === 0) {
    return [];
  }

  const detailPromises = uniqueIds.map(id => tvdb.getSeriesExtended(id));
  const detailedResults = await Promise.all(detailPromises);
  
  const parsePromises = detailedResults.map(record => parseTvdbSearchResult(record, language));
  return (await Promise.all(parsePromises)).filter(Boolean);
}



async function getSearch(id, type, language, query, config) {
  try {
    let metas = [];
    if (type === 'movie') {
      const genreList = await getGenreList(language, type);
      // sanitize movie search query as well for consistency
      const sanitizedQuery = sanitizeQuery(query);
      metas = await performMovieSearch(sanitizedQuery, language, config, genreList);
    } else {
      metas = await performSeriesSearch(query, language);
    }
    return { metas };
  } catch (error) {
    console.error(`Error during search for query "${query}":`, error);
    return { metas: [] };
  }
}

module.exports = { getSearch };
