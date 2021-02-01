const FanartTvApi = require("fanart.tv-api");
const apiKey = process.env.fanart_api;
const baseUrl = "http://webservice.fanart.tv/v3/";
const fanart = new FanartTvApi({ apiKey, baseUrl });

async function getLogo(tmdbId, language, original_language) {
  const meta = fanart
    .getMovieImages(tmdbId)
    .then((res) => {
      const resp = res.hdmovielogo;
      function logo() {
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
      let { url } = logo();
      return url;
    })
    .catch(console.error);
  return meta;
}

async function getTvLogo(tvdb_id, language, original_language) {
  const meta = fanart
    .getShowImages(tvdb_id)
    .then((res) => {
      const resp = res.hdtvlogo;
      function logo() {
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
      let { url } = logo();
      return url;
    })
    .catch(console.error);
  return meta;
}

module.exports = { getLogo, getTvLogo };
