require('dotenv').config()
const FanartTvApi = require("fanart.tv-api");
const apiKey = process.env.FANART_API;
const baseUrl = "http://webservice.fanart.tv/v3/";
const fanart = new FanartTvApi({ apiKey, baseUrl });

function pickLogo(resp, language, original_language) {
  if (
    resp.find((data) => data.lang === language.split("-")[0]) != undefined
  ) {
    return resp.find((data) => data.lang === language.split("-")[0]);
  } else if (
    resp.find((data) => data.lang === original_language) != undefined
  ) {
    return resp.find((data) => data.lang === original_language);
  } else if (resp.find((data) => data.lang === "en") != undefined) {
    return resp.find((data) => data.lang === "en");
  } else {
    return resp[0];
  }
}

async function getLogo(tmdbId, language, original_language) {
  if (!tmdbId) return Promise.reject(Error(`TMDB ID Not available for Fanart: ${tmdbId}`));
  const meta = fanart
    .getMovieImages(tmdbId)
    .then((res) => {
      const resp = res.hdmovielogo
      if (resp !== undefined) {
        const { url } = pickLogo(resp, language, original_language);
        return url
      } else {
        return ''
      }
    })
    .catch((err) => {
      return ""
    });
  return meta;
}

async function getTvLogo(tvdb_id, language, original_language) {
  if (!tvdb_id) return Promise.reject(Error(`TVDB ID Not available for Fanart: ${tvdb_id}`));
  const meta = fanart
    .getShowImages(tvdb_id)
    .then((res) => {
      const resp = res.hdtvlogo;
      if (resp !== undefined) {
        const { url } = pickLogo(resp, language, original_language);
        return url
      } else {
        return ''
      }
    })
    .catch((err) => {
      return ""
    });
  return meta;
}

module.exports = { getLogo, getTvLogo };