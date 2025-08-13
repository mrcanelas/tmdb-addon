require('dotenv').config()
const { get } = require('../utils/httpClient')

async function getRequestToken() {
  return get(`https://api.themoviedb.org/3/authentication/token/new?api_key=${process.env.TMDB_API}`)
    .then((res) => {
      return res.data
    })
    .catch(err => {
      return { success: false, status_message: err.message }
    })
}

async function getSessionId(requestToken) {
  return get(`https://api.themoviedb.org/3/authentication/session/new?api_key=${process.env.TMDB_API}&request_token=${requestToken}`)
    .then((res) => {
      return res.data
    })
    .catch(err => {
      return { success: false, status_message: err.message }
    })
}

module.exports = { getRequestToken, getSessionId };