const fetch = require('node-fetch');
const TVMAZE_API_URL = 'https://api.tvmaze.com';

/**
 * Gets the basic show object from TVmaze using an IMDb ID.
 */
async function getShowByImdbId(imdbId) {
  const url = `${TVMAZE_API_URL}/lookup/shows?imdb=${imdbId}`;
  try {
    const response = await fetch(url);
    if (response.status === 404) return null;
    return await response.json();
  } catch (error) {
    console.error(`Error in getShowByImdbId for IMDb ${imdbId}:`, error.message);
    return null;
  }
}

/**
 * Gets the full show details, including all episodes and cast, using a TVmaze ID.
 */
async function getShowDetails(tvmazeId) {
  const url = `${TVMAZE_API_URL}/shows/${tvmazeId}?embed[]=episodes&embed[]=cast`;
  try {
    const response = await fetch(url);
    if (response.status === 404) return null;
    return await response.json();
  } catch (error) {
    console.error(`Error in getShowDetails for TVmaze ID ${tvmazeId}:`, error.message);
    return null;
  }
}

/**
 * Searches for shows on TVmaze based on a query.
 */
async function searchShows(query) {
  const url = `${TVMAZE_API_URL}/search/shows?q=${encodeURIComponent(query)}`;
  try {
    const response = await fetch(url);
    if (!response.ok) return [];
    return await response.json();
  } catch (error) {
    console.error(`Error searching TVmaze for query "${query}":`, error.message);
    return [];
  }
}


async function getShowByTvdbId(tvdbId) {
  const url = `${TVMAZE_API_URL}/lookup/shows?thetvdb=${tvdbId}`;
  try {
    const response = await fetch(url);
    if (response.status === 404) return null;
    return await response.json();
  } catch (error) {
    console.error(`Error in getShowByTvdbId for TVDB ${tvdbId}:`, error.message);
    return null;
  }
}


async function searchPeople(query) {
  const url = `${TVMAZE_API_URL}/search/people?q=${encodeURIComponent(query)}`;
  try {
    const response = await fetch(url);
    if (!response.ok) return [];
    return await response.json();
  } catch (error) { console.error(`Error searching TVmaze for person "${query}":`, error.message); return []; }
}

async function getPersonCastCredits(personId) {
  const url = `${TVMAZE_API_URL}/people/${personId}/castcredits?embed=show`;
  try {
    const response = await fetch(url);
    if (!response.ok) return [];
    return await response.json();
  } catch (error) { console.error(`Error fetching cast credits for person ID ${personId}:`, error.message); return []; }
}

module.exports = {
  getShowByImdbId,
  getShowDetails,
  getShowByTvdbId,
  searchShows,
  searchPeople,
  getPersonCastCredits,
};
