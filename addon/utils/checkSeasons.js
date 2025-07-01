const axios = require('axios');
const { cache } = require("../lib/getCache");

const CHECK_INTERVAL_DAYS = 7; // You can adjust as needed
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GITHUB_REPO = process.env.GITHUB_REPO; // Ex: 'mrcanelas/tmdb-addon'

async function getLastChecked(tmdbId) {
  if (!cache) return null;
  return await cache.get(`lastChecked:${tmdbId}`);
}

async function setLastChecked(tmdbId, date) {
  if (!cache) return;
  await cache.set(`lastChecked:${tmdbId}`, date, { ttl: 365 * 24 * 60 * 60 }); // 1 year of TTL
}

async function openGithubIssue(title, body) {
  if (!GITHUB_TOKEN || !GITHUB_REPO) return;
  await axios.post(
    `https://api.github.com/repos/${GITHUB_REPO}/issues`,
    { title, body },
    { headers: { Authorization: `token ${GITHUB_TOKEN}` } }
  );
}

async function checkSeasonsAndReport(tmdbId, imdbId, resp, name) {
  const last = await getLastChecked(tmdbId);
  const now = new Date();
  const diffDays = last ? (now - new Date(last)) / (1000 * 60 * 60 * 24) : Infinity;
  if (diffDays < CHECK_INTERVAL_DAYS) return; // Do not check yet

  // 1. Number of seasons from TMDB (resp)
  let tmdbSeasons = 0;
  if (resp.meta && resp.meta.videos) {
    tmdbSeasons = new Set(resp.meta.videos
      .map(v => v.season)
      .filter(season => season !== 0 && season !== "0")
    ).size;
  } else if (resp.seasons) {
    tmdbSeasons = resp.seasons.filter(s => s.season_number !== 0 && s.season_number !== "0").length;
  }

  // 2. Number of seasons from Stremio
  const stremioUrl = `https://v3-cinemeta.strem.io/meta/series/${imdbId}.json`;
  let stremioSeasons = 0;
  try {
    const stremioResp = await axios.get(stremioUrl);
    const stremioVideos = stremioResp.data.meta.videos || [];
    stremioSeasons = new Set(stremioVideos
      .map(v => v.season)
      .filter(season => season !== 0 && season !== "0")
    ).size;
  } catch (e) {
    // If unable to access the Stremio API, do nothing
    return;
  }

  console.log({tmdbSeasons, stremioSeasons})

  // 3. Compare and open issue if necessary
  if (tmdbSeasons !== stremioSeasons) {
    const tmdbLink = `https://www.themoviedb.org/tv/${tmdbId}`;
    const imdbLink = `https://www.imdb.com/title/${imdbId}`;
    const body = `There is a difference in the number of seasons for this series.\n\n` +
      `**TMDB:** ${tmdbSeasons} seasons\n` +
      `**Stremio:** ${stremioSeasons} seasons\n` +
      `\n` +
      `**TMDB ID:** ${tmdbId}\n` +
      `**IMDB ID:** tt${imdbId}\n` +
      `\n` +
      `- [TMDB page](${tmdbLink})\n` +
      `- [IMDB page](${imdbLink})`;
    await openGithubIssue(
      `Season count mismatch in "${name}"`,
      body
    );
  }

  // 4. Update lastChecked
  await setLastChecked(tmdbId, now.toISOString());
}

module.exports = { checkSeasonsAndReport }; 