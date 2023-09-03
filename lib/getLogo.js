import 'dotenv/config';
import FanartTvApi from "fanart.tv-api";
const apiKey = process.env.fanart_api;
const baseUrl = "http://webservice.fanart.tv/v3/";
const fanart = new FanartTvApi({ apiKey, baseUrl });

function pickLogo(resp, language, original_language) {
  if (
    resp.find(({ lang }) => lang === language.split("-")[0]) != undefined
  ) {
    return resp.find(({ lang }) => lang === language.split("-")[0]);
  } else if (
    resp.find(({ lang }) => lang === original_language) != undefined
  ) {
    return resp.find(({ lang }) => lang === original_language);
  } else if (resp.find(({ lang }) => lang === "en") != undefined) {
    return resp.find(({ lang }) => lang === "en");
  } else {
    return resp[0];
  }
}

async function getLogo(tmdbId, language, original_language) {
  if (!tmdbId) return Promise.reject(Error(`TMDB ID Not available for Fanart: ${tmdbId}`));
  const meta = fanart
    .getMovieImages(tmdbId)
    .then(({ hdmovielogo }) => {
      const resp = hdmovielogo
      if (resp !== undefined) {
        const { url } = pickLogo(resp, language, original_language);
        return url
      } else {
        return ''
      }
    })
    .catch(err => "");
  return meta;
}

async function getTvLogo(tvdb_id, language, original_language) {
  if (!tvdb_id) return Promise.reject(Error(`TVDB ID Not available for Fanart: ${tvdb_id}`));
  const meta = fanart
    .getShowImages(tvdb_id)
    .then(({ hdtvlogo }) => {
      const resp = hdtvlogo;
      if (resp !== undefined) {
        const { url } = pickLogo(resp, language, original_language);
        return url
      } else {
        return ''
      }
    })
    .catch(err => "");
  return meta;
}

export { getLogo, getTvLogo };