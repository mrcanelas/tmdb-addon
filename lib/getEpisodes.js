require("dotenv").config();
const { MovieDb } = require('moviedb-promise')
const moviedb = new MovieDb(process.env.tmdb_api)
const diferentOrder = require('../static/diferentOrder.json')
const diferentImdbId = require('../static/diferentImdbId.json')

async function getEpisodes(language, tmdbId, imdb_id, seasons) {
  const series = diferentOrder.find((data) => data.tmdbId === tmdbId);
  const difImdbId = diferentImdbId.find((data) => data.tmdbId === tmdbId);
  imdb_id = !difImdbId ? imdb_id : difImdbId.imdbId 
  if (series != undefined) {
    return await moviedb
    .episodeGroup({ language: language, id: series.episodeGroupId })
      .then((episodeGroups) =>
        episodeGroups.groups
          .map((group) =>
            group.episodes.map((episode, index) => ({
              id: series.watchOrderOnly
                ? `${imdb_id}:${episode.season_number}:${episode.episode_number}`
                : `${imdb_id}:${group.order}:${index + 1}`,
              title: episode.name,
              season: group.order,
              episode: index + 1,
              released: series.watchOrderOnly
                ? new Date(Date.parse(group.episodes[0].air_date) + index)
                : new Date(Date.parse(episode.air_date) + index),
              overview: episode.overview,
            }))
          )
          .reduce((a, b) => a.concat(b), [])
      )
      .catch(console.error);
  } else {
    return await Promise.all(seasons.map(async (el) => {
      return await moviedb
      .seasonInfo({id: tmdbId, language, season_number: el.season_number})
        .then((res) => {
            return res.episodes.map((el, index) => {
              return {
                id:
                  imdb_id
                    ? `${imdb_id}:${el.season_number}:${index + 1}`
                    : `tmdb:${tmdbId}:${el.season_number}:${index + 1}`,
                name: el.name,
                season: el.season_number,
                number: index + 1,
                episode: index + 1,
                thumbnail: `https://image.tmdb.org/t/p/w500${el.still_path}`,
                overview: el.overview,
                description: el.overview,
                rating: el.vote_average,
                firstAired: new Date(Date.parse(el.air_date) + el.season_number),
                released: new Date(Date.parse(el.air_date) + el.season_number),
              };
            })
        })
        .catch(console.error)
    }))
  }
}

module.exports = { getEpisodes };
