require("dotenv").config();
const { MovieDb } = require("moviedb-promise");
const moviedb = new MovieDb(process.env.TMDB_API);
const { getGenreList } = require("./getGenreList");
const { parseMedia } = require("../utils/parseProps");

async function getFavorites(type, language, page, sessionId) {
    moviedb.sessionId = sessionId
    const genreList = await getGenreList(language, type);
    const fetchFunction = type === "movie" ? moviedb.accountFavoriteMovies.bind(moviedb) : moviedb.accountFavoriteTv.bind(moviedb);

    return fetchFunction({ language, page })
        .then((res) => ({
            metas: res.results.map(el => parseMedia(el, type, genreList))
        }))
        .catch(console.error);
}

async function getWatchList(type, language, page, sessionId) {
    moviedb.sessionId = sessionId
    const genreList = await getGenreList(language, type);
    const fetchFunction = type === "movie" ? moviedb.accountMovieWatchlist.bind(moviedb) : moviedb.accountTvWatchlist.bind(moviedb);

    return fetchFunction({ language, page })
        .then((res) => ({
            metas: res.results.map(el => parseMedia(el, type, genreList))
        }))
        .catch(console.error);
}

module.exports = { getFavorites, getWatchList }