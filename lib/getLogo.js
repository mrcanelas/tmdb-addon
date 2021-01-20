const axios = require("axios");
const api_key = "67713d889c4375c0a82a71085fffead6"

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
