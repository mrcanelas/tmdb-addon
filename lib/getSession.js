require("dotenv").config();
const axios = require("axios")
const { MovieDb } = require("moviedb-promise");
const moviedb = new MovieDb(process.env.TMDB_API);
moviedb.sessionId = '051e2865c49c81d4c010d1506d9adaef033b2e65'

async function getRequestToken() {
    return moviedb.requestToken()
        .then(response => {
            if (response.success) {
                return response.request_token
            }
        })
}

async function getSessionId(requestToken) {
    return axios.get(`https://api.themoviedb.org/3/authentication/session/new?api_key=${process.env.TMDB_API}&request_token=${requestToken}`)
        .then(response => {
            if (response.data.success) {
                return response.data.session_id
            }
        })
}

module.exports = { getRequestToken, getSessionId }