require('dotenv').config()
const { get, post } = require('../utils/httpClient')

const TRAKT_CLIENT_ID = process.env.TRAKT_CLIENT_ID
const TRAKT_CLIENT_SECRET = process.env.TRAKT_CLIENT_SECRET

/**
 * Obtém o redirect URI baseado no host da requisição ou variável de ambiente
 * @param {string} requestHost - Host da requisição (ex: https://meu-dominio.com)
 * @returns {string} - Redirect URI completo
 */
function getRedirectUri(requestHost = null) {
  // Se foi passado um host na requisição, usa ele
  if (requestHost) {
    // Remove trailing slash se existir
    const baseUrl = requestHost.replace(/\/$/, '')
    // Usa o callback OAuth para funcionar com popup
    return `${baseUrl}/configure/oauth-callback`
  }
  
  // Fallback para variável de ambiente ou padrão
  const baseUrl = process.env.HOST_NAME || 'http://localhost:3000'
  return process.env.TRAKT_REDIRECT_URI || `${baseUrl}/configure/oauth-callback`
}

async function getTraktAuthUrl(requestHost = null) {
  if (!TRAKT_CLIENT_ID) {
    throw new Error('TRAKT_CLIENT_ID não configurado')
  }

  const redirectUri = getRedirectUri(requestHost)
  const state = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
  
  const authUrl = `https://trakt.tv/oauth/authorize?response_type=code&client_id=${TRAKT_CLIENT_ID}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}`
  
  return { authUrl, state, redirectUri }
}

async function getTraktAccessToken(code, redirectUri = null) {
  if (!TRAKT_CLIENT_ID || !TRAKT_CLIENT_SECRET) {
    throw new Error('TRAKT_CLIENT_ID ou TRAKT_CLIENT_SECRET não configurados')
  }

  // Usa o redirect_uri fornecido ou o padrão
  const finalRedirectUri = redirectUri || getRedirectUri()

  try {
    const response = await post('https://api.trakt.tv/oauth/token', {
      code,
      client_id: TRAKT_CLIENT_ID,
      client_secret: TRAKT_CLIENT_SECRET,
      redirect_uri: finalRedirectUri,
      grant_type: 'authorization_code'
    }, {
      headers: {
        'Content-Type': 'application/json'
      }
    })

    return response.data || response
  } catch (err) {
    console.error('Erro ao obter access token do Trakt:', err)
    return { success: false, error: err.message || 'Erro ao autenticar com Trakt' }
  }
}

async function refreshTraktAccessToken(refreshToken, redirectUri = null) {
  if (!TRAKT_CLIENT_ID || !TRAKT_CLIENT_SECRET) {
    throw new Error('TRAKT_CLIENT_ID ou TRAKT_CLIENT_SECRET não configurados')
  }

  // Usa o redirect_uri fornecido ou o padrão
  const finalRedirectUri = redirectUri || getRedirectUri()

  try {
    const response = await post('https://api.trakt.tv/oauth/token', {
      refresh_token: refreshToken,
      client_id: TRAKT_CLIENT_ID,
      client_secret: TRAKT_CLIENT_SECRET,
      redirect_uri: finalRedirectUri,
      grant_type: 'refresh_token'
    }, {
      headers: {
        'Content-Type': 'application/json'
      }
    })

    return response.data || response
  } catch (err) {
    console.error('Erro ao renovar access token do Trakt:', err)
    return { success: false, error: err.message || 'Erro ao renovar token do Trakt' }
  }
}

module.exports = { getTraktAuthUrl, getTraktAccessToken, refreshTraktAccessToken }

