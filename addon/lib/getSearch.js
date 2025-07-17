require("dotenv").config();
const { MovieDb } = require("moviedb-promise");
const { transliterate } = require("transliteration");
const { getGenreList } = require("./getGenreList");
const { parseMedia } = require("../utils/parseProps");
const tvmaze = require("./tvmaze");
const tvdb =require("./tvdb");

const moviedb = new MovieDb(process.env.TMDB_API);

function sanitizeTvmazeQuery(query) {
  if (!query) return '';
  return query.replace(/[\[\]()]/g, ' ').replace(/[:.-]/g, ' ').trim().replace(/\s\s+/g, ' ');
}

function parseTvmazeResult(show) {
  if (!show || !show.id || !show.name) return null;
  const id = show.externals?.themoviedb ? `tmdb:${show.externals.themoviedb}`
           : (show.externals?.tvdb ? `tvdb:${show.externals.tvdb}` : show.externals?.imdb);

  if (!id) return null;

  return {
    id: id,
    type: 'series',
    name: show.name,
    poster: show.image ? show.image.medium : null,
    background: show.image ? show.image.original : null,
    description: show.summary ? show.summary.replace(/<[^>]*>?/gm, '') : '',
    genres: show.genres || [],
    year: show.premiered ? show.premiered.substring(0, 4) : '',
    imdbRating: show.rating?.average ? show.rating.average.toFixed(1) : 'N/A'
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
  const sanitizedQuery = sanitizeTvmazeQuery(query);
  if (!sanitizedQuery) return [];

  const [titleResults, peopleResults] = await Promise.all([
    tvmaze.searchShows(sanitizedQuery),
    tvmaze.searchPeople(sanitizedQuery)
  ]);
  
  const searchResults = new Map();
  const addResult = (show) => {
    const parsed = parseTvmazeResult(show);
    if (parsed && show?.id && !searchResults.has(show.id)) {
      searchResults.set(show.id, parsed);
    }
  };

  titleResults.forEach(result => addResult(result.show));

  if (peopleResults.length > 0) {
    const personId = peopleResults[0].person.id;
    const castCredits = await tvmaze.getPersonCastCredits(personId);
    castCredits.forEach(credit => addResult(credit._embedded.show));
  }
  
  if (searchResults.size > 0) {
    return Array.from(searchResults.values());
  }
  
  // --- TIER 2 & 3 FALLBACKS ---
  console.log(`Initial searches failed for "${query}". Trying fallback tiers...`);
  /*const tvdbResults = await tvdb.search(query);
  if (tvdbResults.length > 0) {
    const topTvdbResult = tvdbResults[0];
    const tvdbId = topTvdbResult.tvdb_id;
    if (tvdbId) {
      const finalShow = await tvmaze.getShowByTvdbId(tvdbId);
      if (finalShow) return [parseTvmazeResult(finalShow)].filter(Boolean);
    }
  }*/
  
  const tmdbResults = await moviedb.searchTv({ query: query, language });
  if (tmdbResults.results.length > 0) {
    const topTmdbResult = tmdbResults.results[0];
    const tmdbInfo = await moviedb.tvInfo({ id: topTmdbResult.id, append_to_response: 'external_ids' });
    const imdbId = tmdbInfo.external_ids?.imdb_id;
    if (imdbId) {
      const finalShow = await tvmaze.getShowByImdbId(imdbId);
      if (finalShow) return [parseTvmazeResult(finalShow)].filter(Boolean);
    }
  }

  return [];
}

async function getSearch(id, type, language, query, config) {
  try {
    let metas = [];
    if (type === 'movie') {
      const genreList = await getGenreList(language, type);
      metas = await performMovieSearch(query, language, config, genreList);
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
