const { MovieDb } = require("moviedb-promise");
const moviedb = new MovieDb("5a5366fc507321122c90b2b809b5ab20");

async function getEpisodes(language, tmdbId, imdb_id, seasons) {
  const episodes = seasons.map((el) => {
    const season = moviedb
      .seasonInfo({ language: language, id: tmdbId, season_number: el.season_number })
      .then((res) => {
        const meta = res.episodes.map((el) => {
            return {
              id: `${imdb_id}:${el.season_number}:${el.episode_number}`,
              name: `${el.name}`,
              season: `${el.season_number}`,
//            number: `${index + 1}`,
              episode: `${el.episode_number}`,
//            thumbnail: `https://image.tmdb.org/t/p/original${el.still_path}`,
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

module.exports = { getEpisodes };
