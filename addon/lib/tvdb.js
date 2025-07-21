require('dotenv').config();
const { cacheWrapTvdbApi } = require('./getCache');
const { to3LetterCode } = require('./language-map');
const fetch = require('node-fetch');

const TVDB_API_URL = 'https://api4.thetvdb.com/v4';
const TVDB_API_KEY = process.env.TVDB_API_KEY;

let authToken = null;
let tokenExpiry = 0;

async function getAuthToken() {
  if (authToken && Date.now() < tokenExpiry) return authToken;
  if (!TVDB_API_KEY) {
    console.error('TVDB API Key is not configured in .env file.');
    return null;
  }
  try {
    const response = await fetch(`${TVDB_API_URL}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ apikey: TVDB_API_KEY }),
    });
    if (!response.ok) {
      console.error(`Failed to get TVDB auth token: ${response.statusText}`);
      return null;
    }
    const data = await response.json();
    authToken = data.data.token;
    // TVDB tokens are valid for 1 month, we'll refresh it after 28 days just to be safe.
    tokenExpiry = Date.now() + (28 * 24 * 60 * 60 * 1000);
    return authToken;
  } catch (error) {
    console.error('Failed to get TVDB auth token:', error.message);
    return null;
  }
}

async function searchSeries(query) {
  const token = await getAuthToken();
  if (!token) return [];
  try {
    const response = await fetch(`${TVDB_API_URL}/search?query=${encodeURIComponent(query)}&type=series`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    if (!response.ok) return [];
    const data = await response.json();
    return data.data || [];
  } catch (error) {
    console.error(`Error searching TVDB for series "${query}":`, error.message);
    return [];
  }
}

async function searchPeople(query) {
  const token = await getAuthToken();
  if (!token) return [];
  try {
    const response = await fetch(`${TVDB_API_URL}/search?query=${encodeURIComponent(query)}&type=person`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    if (!response.ok) return [];
    const data = await response.json();
    return data.data || [];
  } catch (error) {
    console.error(`Error searching TVDB for person "${query}":`, error.message);
    return [];
  }
}

async function getSeriesExtended(tvdbId) {
  // Use the cache wrapper! The key is simple and unique.
  return cacheWrapTvdbApi(`series-extended:${tvdbId}`, async () => {
    const token = await getAuthToken();
    if (!token) return null;

    const url = `${TVDB_API_URL}/series/${tvdbId}/extended?meta=translations`;
    try {
      const response = await fetch(url, { headers: { 'Authorization': `Bearer ${token}` } });
      if (!response.ok) return null;
      const data = await response.json();
      return data.data;
    } catch(error) {
      console.error(`Error fetching extended series data for TVDB ID ${tvdbId}:`, error.message);
      return null; // Return null on failure so the cache doesn't store a bad result
    }
  });
}

async function getPersonExtended(personId) {
  const token = await getAuthToken();
  if (!token) return null;
  try {
    const response = await fetch(`${TVDB_API_URL}/people/${personId}/extended`, {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!response.ok) return null;
    const data = await response.json();
    return data.data;
  } catch(error) {
    console.error(`Error fetching extended person data for Person ID ${personId}:`, error.message);
    return null;
  }
}

async function getSeriesEpisodes(tvdbId, language = 'en-US', seasonType = 'official') {
  // Use the cache wrapper! The key includes the language for translated results.
  return cacheWrapTvdbApi(`series-episodes:${tvdbId}:${language}`, async () => {
    const token = await getAuthToken();
    if (!token) return null;
    
    const langCode2 = language.split('-')[0];
    const langCode3 = await to3LetterCode(langCode2);
    
    let allEpisodes = [];
    let page = 0;
    let hasNextPage = true;

    while(hasNextPage) {
      const url = `${TVDB_API_URL}/series/${tvdbId}/episodes/${seasonType}/${langCode3}?page=${page}`;
      try {
        const response = await fetch(url, { headers: { 'Authorization': `Bearer ${token}` } });
        if (!response.ok) {
          if (page === 0 && langCode3 !== 'eng') {
            console.warn(`Could not fetch episodes in '${langCode3}', falling back to 'eng'.`);
            // If the primary language fails, we call the function again for English.
            return getSeriesEpisodes(tvdbId, 'en-US');
          }
          hasNextPage = false;
          continue;
        }
        const data = await response.json();
        if (data.data && data.data.episodes) {
          allEpisodes.push(...data.data.episodes);
        }
        hasNextPage = data.links && data.links.next;
        page++;
      } catch(error) {
        console.error(`Error fetching page ${page} of episodes for TVDB ID ${tvdbId}:`, error.message);
        hasNextPage = false;
      }
    }
    return { episodes: allEpisodes };
  });
}

module.exports = {
  searchSeries,
  searchPeople,
  getSeriesExtended,
  getPersonExtended,
  getSeriesEpisodes
};
