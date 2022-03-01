require("dotenv").config();
const { links } = require("express/lib/response");
const { MovieDb } = require("moviedb-promise");
const moviedb = new MovieDb(process.env.tmdb_api);
const { getEpisodes } = require("./getEpisodes");
const { getLogo, getTvLogo } = require("./getLogo");

async function getMeta(type, language, tmdbId) {
  if (type === "movie") {
    const meta = await moviedb
      .movieInfo({ id: tmdbId, language, append_to_response: "videos,credits" })
      .then(async (res) => {
        const logo = await getLogo(tmdbId, language, res.original_language);
        const links = []
        const slug = `movie/${res.title.toLowerCase().replace(/ /g, "-")}-${
          res.imdb_id ? res.imdb_id.replace("tt", "") : ""
        }`
        const genres = res.genres.map((el) => {
          return el.name;
        })
        const cast = res.credits.cast.slice(0, 4).map((el) => {
          return el.name;
        })
        const director = res.credits.crew
        .filter((x) => x.job === "Director")
        .map((el) => {
          return el.name;
        })
        const writer = res.credits.crew
        .filter((x) => x.job === "Writer")
        .map((el) => {
          return el.name;
        })
        const trailers = res.videos.results
        .filter((x) => x.type === "Trailer")
        .map((el) => {
          return {
            source: `${el.key}`,
            type: `${el.type}`,
          };
        })
        links.push(
          {
            "name": res.vote_average,
            "category": "imdb",
            "url": `https://imdb.com/title/${res.imdb_id}`
          },
          {
            "name": res.title,
            "category": "share",
            "url": `https://www.strem.io/s/movie/${slug}`
          },
          )
        genres.map((el) => {
          links.push({
            name: el.name,
            category: "Genres",
            url: encodeURI(`stremio:///discover/${__dirname}/${language}/manifest.json/${type}/${type}.top?genre=${el.name}`),
          });
        });
        cast.map((el) => {
          links.push({
            name: el,
            category: "Cast",
            url: encodeURI(`stremio:///search?search=${el}`),
          });
        });
        writer.map((el) => {
          links.push({
            name: el,
            category: "Writers",
            url: encodeURI(`stremio:///search?search=${el}`),
          });
        });
        director.map((el) => {
          links.push({
            name: el,
            category: "Directors",
            url: encodeURI(`stremio:///search?search=${el}`),
          });
        });
        const metas = {
          id: `tmdb:${tmdbId}`,
          imdb_id: res.imdb_id,
          type: type,
          name: res.title,
          slug,
          released: new Date(res.release_date).toISOString(),
          imdbRating: res.vote_average,
          genres,
          cast,
          director,
          writer,
          poster: `https://image.tmdb.org/t/p/w500${res.poster_path}`,
          posterShape: "regular",
          description: res.overview,
          popularity: res.popularity,
          runtime: res.runtime ? `${res.runtime} min` : "",
          background: `https://image.tmdb.org/t/p/original${res.backdrop_path}`,
          logo: logo,
          releaseInfo: res.release_date ? res.release_date.substr(0, 4) : "",
          year: res.release_date ? res.release_date.substr(0, 4) : "",
          released: new Date(res.release_date),
          trailers,
          behaviorHints: {
            defaultVideoId: res.imdb_id ? res.imdb_id : `tmdb:${res.id}`,
          },
          videos: [
            {
              id: res.imdb_id ? res.imdb_id : `tmdb:${res.id}`,
              title: "",
              released: res.release_date
                ? new Date(res.release_date).toISOString()
                : new Date().toISOString(),
            },
          ],
          links,
        };
        return metas;
      })
      .catch(console.error);
    return Promise.resolve({ meta });
  } else {
    const meta = await moviedb
      .tvInfo({
        id: tmdbId,
        language,
        append_to_response: "videos,credits,external_ids",
      })
      .then(async (res) => {
        const logo = await getTvLogo(
          res.external_ids.tvdb_id,
          language,
          res.original_language
        );
        const mapEpisodes = await getEpisodes(
          language,
          tmdbId,
          res.external_ids.imdb_id,
          res.seasons
        );
        const links = []
        const slug = `series/${res.name.toLowerCase().replace(/ /g, "-")}-${
          res.external_ids.imdb_id
            ? res.external_ids.imdb_id.replace("tt", "")
            : ""
        }`
        const genres = res.genres.map((el) => {
          return el.name;
        })
        const cast = res.credits.cast.slice(0, 4).map((el) => {
          return el.name;
        })
        const director = res.credits.crew
        .filter((x) => x.job === "Director")
        .map((el) => {
          return el.name;
        })
        const writer = res.credits.crew
        .filter((x) => x.job === "Writer")
        .map((el) => {
          return el.name;
        })
        const trailers = res.videos.results
        .filter((x) => x.type === "Trailer")
        .map((el) => {
          return {
            source: `${el.key}`,
            type: `${el.type}`,
          };
        })
        links.push(
          {
            "name": res.vote_average,
            "category": "imdb",
            "url": `https://imdb.com/title/${res.imdb_id}`
          },
          {
            "name": res.title,
            "category": "share",
            "url": `https://www.strem.io/s/movie/${slug}`
          },
          )
        genres.map((el) => {
          links.push({
            name: el.name,
            category: "Genres",
            url: encodeURI(`stremio:///discover/${__dirname}/${language}/manifest.json/${type}/${type}.top?genre=${el.name}`),
          });
        });
        cast.map((el) => {
          links.push({
            name: el,
            category: "Cast",
            url: encodeURI(`stremio:///search?search=${el}`),
          });
        });
        writer.map((el) => {
          links.push({
            name: el,
            category: "Writers",
            url: encodeURI(`stremio:///search?search=${el}`),
          });
        });
        function year() {
          if (res.status === "Ended") {
            return res.first_air_date
              ? res.first_air_date.substr(0, 5) + res.last_air_date.substr(0, 4)
              : "";
          } else {
            return res.first_air_date ? res.first_air_date.substr(0, 5) : "";
          }
        }
        const metas = {
          id: `tmdb:${tmdbId}`,
          imdb_id: res.external_ids.imdb_id,
          type: type,
          name: res.name,
          slug,
          imdbRating: res.vote_average,
          genres,
          cast,
          writer,
          poster: `https://image.tmdb.org/t/p/w500${res.poster_path}`,
          posterShape: "regular",
          description: res.overview,
          runtime: res.episode_run_time
            ? `${res.episode_run_time.slice(0, 1)} min`
            : "",
          background: `https://image.tmdb.org/t/p/original${res.backdrop_path}`,
          logo: logo,
          releaseInfo: year(),
          year: year(),
          released: new Date(res.first_air_date),
          trailers,
          videos: [].concat(...mapEpisodes),
          links: links,
        };
        return metas;
      })
      .catch(console.error);
    return Promise.resolve({ meta });
  }
}

module.exports = { getMeta };
