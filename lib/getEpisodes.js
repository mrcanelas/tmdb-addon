require('dotenv').config()
const { MovieDb } = require("moviedb-promise");
const moviedb = new MovieDb(process.env.tmdb_api);

const data = [
  {tmdbId: '71446', episodeGroupId: '5eb730dfca7ec6001f7beb51', name: "Money Heist" },
  {tmdbId: '79242', episodeGroupId: '5ca7dd6f0e0a264c8bf0a62e', name: "Chilling Adventures of Sabrina" },
  {tmdbId: '60554', episodeGroupId: '5b57d247c3a3685c85041004', name: "Star Wars Rebels" },
  {tmdbId: '61374', episodeGroupId: '5b0e30e092514153bc000c06', name: "Tokyo Ghoul"},
  {tmdbId: '4194', episodeGroupId: '5b11ba820e0a265847002c6e', name: "Star Wars: The Clone Wars", watchOrderOnly: true }
];

async function getEpisodes(language, tmdbId, imdb_id, seasons) {
  const series = data.find(data => data.tmdbId === tmdbId)
  if (series != undefined ) {
    return moviedb.episodeGroup({language: language, id: series.episodeGroupId})
      .then(episodeGroups => episodeGroups.groups
          .map(group => group.episodes.map((episode, index) => ({
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
          })))
          .reduce((a, b) => a.concat(b), []));
  } else {
    const episodes = seasons.map((el) => {
      const season = moviedb
        .seasonInfo({ language: language, id: tmdbId, season_number: el.season_number })
        .then((res) => {
          const meta = res.episodes.map((el, index) => {
              return {
                id: `${imdb_id}:${el.season_number}:${index + 1}`,
                name: `${el.name}`,
                season: `${el.season_number}`,
  //            number: `${index + 1}`,
                episode: `${index + 1}`,
  //            thumbnail: `https://image.tmdb.org/t/p/w500${el.still_path}`,
                overview: `${el.overview}`,
                description: `${el.overview}`,
                rating: `${el.vote_average}`,
                firstAired: new Date(Date.parse(el.air_date) + el.season_number),
                released: new Date(Date.parse(el.air_date) + el.season_number),
              }
            })
          return meta
        })
        .catch(console.error);
      return season
    });
    return (async () => {
      const resultado = await Promise.all(episodes);
      return resultado
    })();
  }
}

module.exports = { getEpisodes };
