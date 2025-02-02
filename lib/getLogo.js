require('dotenv').config();
const FanartTvApi = require("fanart.tv-api");
const api_key = process.env.FANART_API;
const baseUrl = "http://webservice.fanart.tv/v3/";
const fanart = new FanartTvApi({ api_key, baseUrl });

const { MovieDb } = require("moviedb-promise");
const moviedb = new MovieDb(process.env.TMDB_API);

function pickLogo(resp, language, original_language) {  
  if (resp.find((data) => data.lang === language.split("-")[0]) != undefined) {
    return resp.find((data) => data.lang === language.split("-")[0]);
  } else if (resp.find((data) => data.lang === original_language) != undefined) {
    return resp.find((data) => data.lang === original_language);
  } else if (resp.find((data) => data.lang === "en") != undefined) {
    return resp.find((data) => data.lang === "en");
  } else {
    return resp[0];
  }
}

async function getLogo(tmdbId, language, original_language) {
  if (!tmdbId) return Promise.reject(Error(`TMDB ID Not available for Fanart: ${tmdbId}`));

  const fanartLogo = await fanart
    .getMovieImages(tmdbId)
    .then((res) => {
      const resp = res.hdmovielogo;
      if (resp !== undefined) {
        const { url } = pickLogo(resp, language, original_language);
        return url;
      } else {
        return '';
      }
    })
    .catch((err) => {
      console.error("Error fetching logo from Fanart.tv:", err);
      return '';
    });

  if (fanartLogo) {
    return fanartLogo;
  } else {
    const tmdbLogo = await moviedb.movieImages({ id: tmdbId })
      .then((res) => {
        if (res.logos && res.logos.length > 0) {
          const logo = res.logos.find(
            (logo) => logo.iso_639_1 === language.split("-")[0]
          ) || res.logos.find((logo) => logo.iso_639_1 === original_language) || res.logos.find((logo) => logo.iso_639_1 === "en");

          const logoUrl = logo ? `https://image.tmdb.org/t/p/original${logo.file_path}` : '';
          return logoUrl;
        }
        return '';
      })
      .catch((err) => {
        console.error("Error fetching logo from TMDB:", err);
        return '';
      });

    return tmdbLogo;
  }
}

async function getTvLogo(tvdb_id, tmdbId, language, original_language) {
  if (!tvdb_id && !tmdbId) {
    return Promise.reject(Error(`TVDB ID and TMDB ID not available for logos.`));
  }

  const fanartLogo = await fanart
    .getShowImages(tvdb_id)
    .then((res) => {
      const resp = res.hdtvlogo;
      if (resp !== undefined) {
        const { url } = pickLogo(resp, language, original_language);
        return url;
      } else {
        return '';
      }
    })
    .catch((err) => {
      console.error("Error fetching TV logo from Fanart.tv:", err);
      return '';
    });

  if (fanartLogo) {
    return fanartLogo;
  } else if (tmdbId) {
    const tmdbLogo = await moviedb.tvImages({ id: tmdbId })
      .then((res) => {
        if (res.logos && res.logos.length > 0) {
          const logo = res.logos.find(
            (logo) => logo.iso_639_1 === language.split("-")[0]
          ) || res.logos.find((logo) => logo.iso_639_1 === original_language) || res.logos.find((logo) => logo.iso_639_1 === "en");

          const logoUrl = logo ? `https://image.tmdb.org/t/p/original${logo.file_path}` : '';
          return logoUrl;
        }
        return '';
      })
      .catch((err) => {
        console.error("Error fetching TV logo from TMDB:", err);
        return '';
      });

    return tmdbLogo;
  }

  return '';
}

module.exports = { getLogo, getTvLogo };
