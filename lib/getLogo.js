const FanartTvApi = require("fanart.tv-api");
const apiKey = process.env.fanart_api;
const baseUrl = "http://webservice.fanart.tv/v3/";
const fanart = new FanartTvApi({ apiKey, baseUrl });

async function getLogo(tmdbId) {
  const meta = fanart
    .getMovieImages(tmdbId)
    .then((res) => {
      const resp = res.hdmovielogo;
      const logo = resp.map((el) => {
        return el.url;
      });
      return logo.slice(0, 1).toString();
    })
    .catch(console.error);
  return meta;
}

async function getTvLogo(tvdb_id) {
  const meta = fanart
    .getShowImages(tvdb_id)
    .then((res) => {
      const resp = res.hdtvlogo;
      const logo = resp.map((el) => {
        return el.url;
      });
      return logo.slice(0, 1).toString();
    })
    .catch(console.error);
  return meta;
}

module.exports = { getLogo, getTvLogo };
