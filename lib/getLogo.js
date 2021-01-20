const axios = require("axios");
const api_key = process.env.fanart_api

async function getLogo(tvdb_id, type, tmdbId) {
  if (type === "movie") {
    try {
      var meta = await axios.get(
        `http://webservice.fanart.tv/v3/movies/${tmdbId}?api_key=${api_key}`
      );
    } catch (error) {
      console.error(`The MovieDB ${error.response.status}`);
    }
    return meta.data.hdmovielogo;
  } else {
    try {
        var meta = await axios.get(
          `http://webservice.fanart.tv/v3/tv/${tvdb_id}?api_key=${api_key}`
        );
      } catch (error) {
        console.error(`The MovieDB ${error.response.status}`);
      }
      return meta.data.hdtvlogo;
  }
}

module.exports = { getLogo };
