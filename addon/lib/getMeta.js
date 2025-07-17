require("dotenv").config();
const { MovieDb } = require("moviedb-promise");
const Utils = require("../utils/parseProps");
const moviedb = new MovieDb(process.env.TMDB_API);
const tvmaze = require("./tvmaze");
const { getLogo } = require("./getLogo");
const { getImdbRating } = require("./getImdbRating");
const { getEpisodeThumbnail } = require("../utils/getEpisodeThumbnail");
const { checkSeasonsAndReport } = require("../utils/checkSeasons");

const processLogo = (logoUrl) => {
  if (!logoUrl) return null;
  return logoUrl.replace(/^http:/, "https:");
};


async function getMeta(type, language, imdbId, config = {}) {
  try {
    let meta;
    if (type === 'movie') {
      meta = await getMovieMetaByImdbId(imdbId, language, config);
    } else { // 'series'
      meta = await getSeriesMetaByImdbId(imdbId, language, config);
    }
    return { meta };
  } catch (error) {
    console.error(`Failed to get meta for ${type} with IMDb ID ${imdbId}:`, error.message);
    return { meta: null };
  }
}

// --- Movie Worker ---
async function getMovieMetaByImdbId(imdbId, language, config) {
  const findResults = await moviedb.find({ id: imdbId, external_source: 'imdb_id' });
  const movieTmdb = findResults.movie_results?.[0];
  if (!movieTmdb) throw new Error(`Movie with IMDb ID ${imdbId} not found on TMDB.`);
  
  const movieData = await moviedb.movieInfo({ id: movieTmdb.id, language, append_to_response: "videos,credits,external_ids" });
  return buildMovieResponse(movieData, language, config);
}

// --- Series Worker ---
async function getSeriesMetaByImdbId(imdbId, language, config) {
  const tvmazeShow = await tvmaze.getShowByImdbId(imdbId);
  if (!tvmazeShow) {
    throw new Error(`Series with IMDb ID ${imdbId} not found on TVmaze.`);
  }
  const tvmazeDetails = await tvmaze.getShowDetails(tvmazeShow.id);
  if (!tvmazeDetails) {
    throw new Error(`Could not fetch details for TVmaze ID ${tvmazeShow.id}.`);
  }
  return buildSeriesResponseFromTvmaze(tvmazeDetails, language, config);
}


// --- BUILDERS ---

async function buildMovieResponse(movieData, language, config) {
  const { id: tmdbId, title, external_ids, poster_path, credits } = movieData;
  const imdbId = external_ids?.imdb_id;
  const castCount = config.castCount !== undefined ? Math.max(1, Math.min(5, Number(config.castCount))) : 5;
  const [logoUrl, imdbRatingValue] = await Promise.all([
    getLogo('movie', { tmdbId }, language, movieData.original_language),
    getImdbRating(imdbId, 'movie')
  ]);
  const imdbRating = imdbRatingValue || movieData.vote_average?.toFixed(1) || "N/A";
  return {
    id: `tmdb:${tmdbId}`, type: 'movie', name: title, imdb_id: imdbId,
    slug: Utils.parseSlug('movie', title, imdbId),
    genres: Utils.parseGenres(movieData.genres),
    description: movieData.overview,
    director: Utils.parseDirector(credits).join(', '),
    writer: Utils.parseWriter(credits).join(', '),
    year: movieData.release_date ? movieData.release_date.substring(0, 4) : "",
    released: new Date(movieData.release_date),
    runtime: Utils.parseRunTime(movieData.runtime),
    country: Utils.parseCoutry(movieData.production_countries),
    imdbRating,
    poster: await Utils.parsePoster('movie', tmdbId, poster_path, language, config.rpdbkey),
    background: `https://image.tmdb.org/t/p/original${movieData.backdrop_path}`,
    logo: processLogo(logoUrl),
    trailers: Utils.parseTrailers(movieData.videos),
    trailerStreams: Utils.parseTrailerStream(movieData.videos),
    links: Utils.buildLinks(imdbRating, imdbId, title, 'movie', movieData.genres, credits, language, castCount),
    behaviorHints: { defaultVideoId: imdbId || `tmdb:${tmdbId}`, hasScheduledVideos: false },
  };
}

async function buildSeriesResponseFromTvmaze(tvmazeShow, language, config) {
  const { name, premiered, image, summary, externals } = tvmazeShow;
  const imdbId = externals.imdb;
  const tmdbId = externals.themoviedb;
  const tvdbId = externals.thetvdb;
  const castCount = config.castCount !== undefined ? Math.max(1, Math.min(5, Number(config.castCount))) : 5;

  const [logoUrl, imdbRatingValue] = await Promise.all([
    getLogo('series', { tmdbId, tvdbId }, language, tvmazeShow.language),
    getImdbRating(imdbId, 'series')
  ]);
  const imdbRating = imdbRatingValue || tvmazeShow.rating?.average?.toFixed(1) || "N/A";

  const tmdbLikeCredits = {
    cast: (tvmazeShow?._embedded?.cast || []).map(c => ({
      name: c.person.name, character: c.character.name, profile_path: c.person.image?.medium.replace('https://static.tvmaze.com/uploads/images/', '')
    })),
    crew: (tvmazeShow?._embedded?.cast || []).filter(c => c.type === 'Creator').map(c => ({
        name: c.person.name, job: 'Creator'
    }))
  };

  const videos = (tvmazeShow?._embedded?.episodes || []).map(episode => ({
    id: `${imdbId}:${episode.season}:${episode.number}`,
    title: episode.name || `Episode ${episode.number}`,
    season: episode.season,
    episode: episode.number,
    thumbnail: getEpisodeThumbnail(episode.image?.medium, config.hideEpisodeThumbnails),
    overview: episode.summary ? episode.summary.replace(/<[^>]*>?/gm, '') : '',
    released: new Date(episode.airstamp),
    available: new Date(episode.airstamp) < new Date(),
  }));

  const meta = {
    id: tmdbId ? `tmdb:${tmdbId}` : (tvdbId ? `tvdb:${tvdbId}` : imdbId),
    type: 'series', name, imdb_id: imdbId,
    slug: Utils.parseSlug('series', name, imdbId),
    genres: tvmazeShow.genres || [],
    description: summary ? summary.replace(/<[^>]*>?/gm, '') : '',
    writer: Utils.parseWriter(tmdbLikeCredits).join(', '),
    year: Utils.parseYear(tvmazeShow.status, premiered, tvmazeShow.ended),
    released: new Date(premiered),
    runtime: Utils.parseRunTime(tvmazeShow.runtime),
    status: tvmazeShow.status,
    country: tvmazeShow.network?.country?.name || null,
    imdbRating,
    poster: image?.original, background: image?.original,
    logo: processLogo(logoUrl), videos,
    links: Utils.buildLinks(imdbRating, imdbId, name, 'series', tvmazeShow.genres.map(g => ({ name: g })), tmdbLikeCredits, language, castCount),
    behaviorHints: { defaultVideoId: null, hasScheduledVideos: true },
  };

  if (meta.imdb_id && meta.videos && meta.name) {
    checkSeasonsAndReport(tmdbId, meta.imdb_id, { meta }, meta.name);
  }
  return meta;
}


module.exports = { getMeta };
