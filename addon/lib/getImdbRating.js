const axios = require('axios');

async function getImdbRating(imdbId, type) {
  try {
    const response = await axios.get(`https://v3-cinemeta.strem.io/meta/${type}/${imdbId}.json`, {
      timeout: 10000
    });
    const data = response.data.meta;
    return data?.imdbRating || undefined
  } catch (error) {
    console.error('Error fetching data from Cinemeta:', error);
    return null;
  }
}

module.exports = { getImdbRating }