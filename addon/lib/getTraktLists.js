require('dotenv').config()
const { get } = require('../utils/httpClient')
const { parseMedia } = require('../utils/parseProps')
const { getGenreList } = require('./getGenreList')
const { TMDBClient } = require('../utils/tmdbClient')

const moviedb = new TMDBClient(process.env.TMDB_API)

async function getTraktWatchlist(type, language, page, genre, accessToken) {
  if (!accessToken) {
    throw new Error('Access token do Trakt não fornecido')
  }

  try {
    const typeParam = type === 'movie' ? 'movies' : 'shows'
    const limit = 20
    const offset = (page - 1) * limit

    const response = await get(`https://api.trakt.tv/sync/watchlist/${typeParam}?limit=${limit}&extended=full`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'trakt-api-version': '2',
        'trakt-api-key': process.env.TRAKT_CLIENT_ID
      }
    })

    const items = response.data || []
    
    // Converter itens do Trakt para formato TMDB
    const genreList = await getGenreList(language, type)
    const metas = []

    for (const item of items) {
      try {
        let tmdbId = null

        if (type === 'movie') {
          tmdbId = item.movie?.ids?.tmdb
        } else {
          tmdbId = item.show?.ids?.tmdb
        }

        if (tmdbId) {
          const tmdbItem = type === 'movie' 
            ? await moviedb.movieInfo({ id: tmdbId, language })
            : await moviedb.tvInfo({ id: tmdbId, language })
          if (tmdbItem) {
            const meta = parseMedia(tmdbItem, type, genreList)
            metas.push(meta)
          }
        }
      } catch (err) {
        console.error(`Erro ao processar item do Trakt:`, err)
      }
    }

    return { metas }
  } catch (err) {
    console.error('Erro ao buscar watchlist do Trakt:', err)
    throw err
  }
}

async function getTraktRecommendations(type, language, page, genre, accessToken) {
  if (!accessToken) {
    throw new Error('Access token do Trakt não fornecido')
  }

  try {
    const typeParam = type === 'movie' ? 'movies' : 'shows'
    const limit = 20
    const offset = (page - 1) * limit

    const response = await get(`https://api.trakt.tv/recommendations/${typeParam}?limit=${limit}&extended=full`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'trakt-api-version': '2',
        'trakt-api-key': process.env.TRAKT_CLIENT_ID
      }
    })

    const items = response.data || []
    
    // Converter itens do Trakt para formato TMDB
    const genreList = await getGenreList(language, type)
    const metas = []

    for (const item of items) {
      try {
        let tmdbId = null

        if (type === 'movie') {
          tmdbId = item.movie?.ids?.tmdb
        } else {
          tmdbId = item.show?.ids?.tmdb
        }

        if (tmdbId) {
          const tmdbItem = type === 'movie' 
            ? await moviedb.movieInfo({ id: tmdbId, language })
            : await moviedb.tvInfo({ id: tmdbId, language })
          if (tmdbItem) {
            const meta = parseMedia(tmdbItem, type, genreList)
            metas.push(meta)
          }
        }
      } catch (err) {
        console.error(`Erro ao processar recomendação do Trakt:`, err)
      }
    }

    return { metas }
  } catch (err) {
    console.error('Erro ao buscar recomendações do Trakt:', err)
    throw err
  }
}

module.exports = { getTraktWatchlist, getTraktRecommendations }

