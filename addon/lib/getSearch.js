require("dotenv").config();
const { MovieDb } = require("moviedb-promise");
const { getGenreList } = require("./getGenreList");
const Utils = require("../utils/parseProps");
const tvdb = require("./tvdb");
const { to3LetterCode } = require("./language-map"); 

const moviedb = new MovieDb(process.env.TMDB_API);

function sanitizeQuery(query) {
  if (!query) return '';
  return query.replace(/[\[\]()!?]/g, ' ').replace(/[:.-]/g, ' ').trim().replace(/\s\s+/g, ' ');
}



async function parseTvdbSearchResult(extendedRecord, language, config) {
  if (!extendedRecord || !extendedRecord.id || !extendedRecord.name) return null;

  const langCode = language.split('-')[0];
  const langCode3 = await to3LetterCode(langCode);
  const overviewTranslations = extendedRecord.translations?.overviewTranslations || [];
  const nameTranslations = extendedRecord.translations?.nameTranslations || [];
  const translatedName = nameTranslations.find(t => t.language === langCode3)?.name
                       || nameTranslations.find(t => t.language === 'eng')?.name
                       || extendedRecord.name;

  const overview = overviewTranslations.find(t => t.language === langCode3)?.overview
                   || overviewTranslations.find(t => t.language === 'eng')?.overview
                   || extendedRecord.overview;
  
  const tmdbId = extendedRecord.remoteIds?.find(id => id.sourceName === 'TheMovieDB')?.id;
  const tvdbId = extendedRecord.id;
  return {
    id: `tvdb:${extendedRecord.id}`,
    type: 'series',
    name: translatedName, 
    poster: await Utils.parsePoster('series', { tmdbId, tvdbId }, extendedRecord.image, language, config.rpdbkey),
    year: extendedRecord.year,
    description: overview
  };
}

async function performMovieSearch(query, language, config, genreList) {
    const searchResults = new Map();
    const rawResults = new Map();

    const addRawResult = (media) => {
        if (media && media.id && !rawResults.has(media.id)) {
            rawResults.set(media.id, media);
        }
    };

    const movieRes = await moviedb.searchMovie({ query, language, include_adult: config.includeAdult });
    movieRes.results.forEach(addRawResult);

    const personRes = await moviedb.searchPerson({ query, language });
    if (personRes.results?.[0]) {
        const credits = await moviedb.personMovieCredits({ id: personRes.results[0].id, language });
        credits.cast.forEach(addRawResult);
        credits.crew.forEach(media => { if (media.job === "Director" || media.job === "Writer") addRawResult(media); });
    }

    const hydrationPromises = Array.from(rawResults.values()).map(async (media) => {
        const parsed = Utils.parseMedia(media, 'movie', genreList);
        parsed.poster = await Utils.parsePoster('movie', { tmdbId: media.id }, media.poster_path, language, config.rpdbkey);
        return parsed;
    });

    const hydratedMetas = await Promise.all(hydrationPromises);
    hydratedMetas.forEach(parsed => {
        if(parsed && !searchResults.has(parsed.id)) searchResults.set(parsed.id, parsed);
    });
    
    return Array.from(searchResults.values());
}

async function performSeriesSearch(query, language, config) {
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
  
  const parsePromises = detailedResults.map(record => parseTvdbSearchResult(record, language, config));
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
      metas = await performSeriesSearch(query, language, config);
    }
    return { metas };
  } catch (error) {
    console.error(`Error during search for query "${query}":`, error);
    return { metas: [] };
  }
}

module.exports = { getSearch };
