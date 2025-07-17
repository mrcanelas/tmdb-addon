// lib/tvdb.js
require('dotenv').config();
const fetch = require('node-fetch');

const TVDB_API_URL = 'https://api4.thetvdb.com/v4';
const TVDB_API_KEY = process.env.TVDB_API_KEY;

let authToken = null;

async function getAuthToken() {
  if (authToken) return authToken;
  if (!TVDB_API_KEY) return null;

  try {
    const response = await fetch(`${TVDB_API_URL}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ apikey: TVDB_API_KEY }),
    });
    if (!response.ok) return null;
    const data = await response.json();
    authToken = data.data.token;
    return authToken;
  } catch (error) {
    console.error('Failed to get TVDB auth token:', error.message);
    return null;
  }
}

async function search(query) {
  const token = await getAuthToken();
  if (!token) {
    console.warn('TVDB search skipped: No API key or auth failed.');
    return [];
  }

  try {
    const response = await fetch(`${TVDB_API_URL}/search?query=${encodeURIComponent(query)}&type=series`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    if (!response.ok) return [];
    const data = await response.json();
    return data.data || [];
  } catch (error) {
    console.error(`Error searching TVDB for query "${query}":`, error.message);
    return [];
  }
}

module.exports = { search };
