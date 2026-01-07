const axios = require('axios');
const { cache } = require("../lib/getCache");
const diferentOrder = require("../static/diferentOrder.json");

const CHECK_INTERVAL_DAYS = 7; // You can adjust as needed
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GITHUB_REPO = process.env.GITHUB_REPO; // Ex: 'mrcanelas/tmdb-addon'

async function getLastChecked(tmdbId) {
  if (!cache) return null;
  return await cache.get(`lastChecked:${tmdbId}`);
}

async function setLastChecked(tmdbId, data) {
  if (!cache) return;
  await cache.set(`lastChecked:${tmdbId}`, data, { ttl: 365 * 24 * 60 * 60 });
}

async function openGithubIssue(title, body, labels = []) {
  if (!GITHUB_TOKEN || !GITHUB_REPO) return;
  await axios.post(
    `https://api.github.com/repos/${GITHUB_REPO}/issues`,
    { title, body, labels },
    { headers: { Authorization: `token ${GITHUB_TOKEN}` } }
  );
}

async function issueExistsOnGithub(title) {
  if (!GITHUB_TOKEN || !GITHUB_REPO) return false;
  const url = `https://api.github.com/repos/${GITHUB_REPO}/issues?labels=season-mismatch&per_page=100`;
  try {
    const resp = await axios.get(url, {
      headers: { Authorization: `token ${GITHUB_TOKEN}` }
    });
    return resp.data.some(issue => issue.title === title);
  } catch (e) {
    console.error('Error checking existing issues:', e.message);
    return false;
  }
}

function existsInDiferentOrder(tmdbId) {
  try {
    return diferentOrder.some(item => 
      item.tmdbId === tmdbId
    );
  } catch (e) {
    console.error('Error reading diferentOrder.json:', e.message);
    return false;
  }
}

function isSeasonReleased(seasonData, now) {
  // Check if season has air_date or first_air_date
  const airDate = seasonData.air_date || seasonData.first_air_date;
  if (!airDate) {
    // If no air date, check if season has episodes with air dates
    if (seasonData.episodes && Array.isArray(seasonData.episodes)) {
      // Season is released if it has at least one episode that has been released
      return seasonData.episodes.some(episode => {
        const episodeAirDate = episode.air_date;
        if (!episodeAirDate) return false;
        const episodeDate = new Date(episodeAirDate);
        return episodeDate <= now;
      });
    }
    return false;
  }
  
  const releaseDate = new Date(airDate);
  // Check if season date has passed AND if it has episodes (if available)
  if (releaseDate > now) return false;
  
  // If season has episodes, verify at least one is released
  if (seasonData.episodes && Array.isArray(seasonData.episodes) && seasonData.episodes.length > 0) {
    return seasonData.episodes.some(episode => {
      const episodeAirDate = episode.air_date;
      if (!episodeAirDate) return false;
      const episodeDate = new Date(episodeAirDate);
      return episodeDate <= now;
    });
  }
  
  // If no episodes info, use season air date
  return releaseDate <= now;
}

function isVideoReleased(video, now) {
  // Check if video has released or firstAired date
  if (video.released) {
    const releasedDate = video.released instanceof Date ? video.released : new Date(video.released);
    return releasedDate <= now;
  }
  if (video.firstAired) {
    const firstAiredDate = video.firstAired instanceof Date ? video.firstAired : new Date(video.firstAired);
    return firstAiredDate <= now;
  }
  // If no date available, assume not released
  return false;
}

async function checkSeasonsAndReport(tmdbId, imdbId, resp, name) {
  // If no cache is available, skip the check
  if (!cache) {
    console.log("Cache not available, skipping season check");
    return;
  }

  const cacheData = await getLastChecked(tmdbId);
  const now = new Date();
  const lastChecked = cacheData && cacheData.lastChecked ? new Date(cacheData.lastChecked) : null;
  const diffDays = lastChecked ? (now - lastChecked) / (1000 * 60 * 60 * 24) : Infinity;
  if (diffDays < CHECK_INTERVAL_DAYS) return; // Do not check yet

  // 1. Number of seasons from TMDB (resp) - only count released seasons
  let tmdbSeasons = 0;
  if (resp.meta && resp.meta.videos) {
    // Count seasons that have at least one released episode
    const releasedSeasons = new Set(resp.meta.videos
      .filter(v => {
        const season = v.season;
        if (season === 0 || season === "0") return false;
        return isVideoReleased(v, now);
      })
      .map(v => v.season)
    );
    tmdbSeasons = releasedSeasons.size;
  } else if (resp.seasons) {
    // Count seasons that have been released
    tmdbSeasons = resp.seasons.filter(s => {
      if (s.season_number === 0 || s.season_number === "0") return false;
      return isSeasonReleased(s, now);
    }).length;
  }

  // 2. Number of seasons from Stremio - only count released seasons
  const stremioUrl = `https://v3-cinemeta.strem.io/meta/series/${imdbId}.json`;
  let stremioSeasons = 0;
  let stremioName = name;
  try {
    const stremioResp = await axios.get(stremioUrl);
    const stremioVideos = stremioResp.data.meta.videos || [];
    // Count seasons that have at least one released episode
    const releasedSeasons = new Set(stremioVideos
      .filter(v => {
        const season = v.season;
        if (season === 0 || season === "0") return false;
        return isVideoReleased(v, now);
      })
      .map(v => v.season)
    );
    stremioSeasons = releasedSeasons.size;
    if (stremioResp.data.meta && stremioResp.data.meta.name) {
      stremioName = stremioResp.data.meta.name;
    }
  } catch (e) {
    // If unable to access the Stremio API, do nothing
    return;
  }

  // 3. Compare and open issue if necessary
  if (tmdbSeasons !== stremioSeasons) {
    console.log("Mismatch found")
    
    // Check if title already exists in diferentOrder.json
    if (existsInDiferentOrder(tmdbId)) {
      console.log("Title already exists in diferentOrder.json, skipping issue creation");
      return;
    }
    
    const tmdbLink = `https://www.themoviedb.org/tv/${tmdbId}`;
    const stremioLink = `https://web.stremio.com/#/detail/series/${imdbId}`;
    const issueTitle = `Season count mismatch in "${stremioName}"`;
    const body = `There is a difference in the number of seasons for this series.\n\n` +
      `**TMDB:** ${tmdbSeasons} seasons\n` +
      `**Stremio:** ${stremioSeasons} seasons\n` +
      `\n` +
      `**TMDB ID:** ${tmdbId}\n` +
      `**IMDB ID:** ${imdbId}\n` +
      `\n` +
      `- [TMDB page](${tmdbLink})\n` +
      `- [Stremio page](${stremioLink})`;
    // Check if issue already exists for this title
    const exists = await issueExistsOnGithub(issueTitle);
    console.log("Exists:", exists)  
    if (!exists) {
      console.log("Creating issue:", issueTitle)
      await openGithubIssue(
        issueTitle,
        body,
        ['season-mismatch']
      );
    }
  }

  // 4. Update lastChecked
  await setLastChecked(tmdbId, { lastChecked: now.toISOString() });
  console.log("Last checked updated")
}

module.exports = { checkSeasonsAndReport }; 