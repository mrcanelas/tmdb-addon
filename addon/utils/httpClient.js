const axios = require('axios');
const https = require('https');
const http = require('http');

// Proxy configuration
const PROXY_CONFIG = {
  enabled: process.env.TMDB_PROXY_ENABLED === 'true',
  host: process.env.TMDB_PROXY_HOST || '127.0.0.1',
  port: process.env.TMDB_PROXY_PORT || 1080,
  protocol: process.env.TMDB_PROXY_PROTOCOL || 'http',
  auth: process.env.TMDB_PROXY_AUTH ? {
    username: process.env.TMDB_PROXY_USERNAME,
    password: process.env.TMDB_PROXY_PASSWORD
  } : undefined
};

// TMDB domains that should use proxy
const TMDB_DOMAINS = [
  'api.themoviedb.org',
  'image.tmdb.org',
  'www.themoviedb.org'
];

/**
 * Check if a URL should use proxy based on domain
 * @param {string} url - URL to check
 * @returns {boolean} - True if should use proxy
 */
function shouldUseProxy(url) {
  if (!PROXY_CONFIG.enabled) return false;
  
  try {
    const urlObj = new URL(url);
    return TMDB_DOMAINS.some(domain => urlObj.hostname.includes(domain));
  } catch (error) {
    console.warn('Error parsing URL for proxy:', error.message);
    return false;
  }
}

/**
 * Create an axios instance with proxy configuration if needed
 * @param {string} url - Request URL
 * @returns {Object} - Configured axios instance
 */
function createAxiosInstance(url) {
  const config = {
    timeout: 30000,
    headers: {
      'User-Agent': 'TMDB-Addon/3.1.7'
    }
  };

  if (shouldUseProxy(url)) {
    console.log(`Using proxy for: ${url}`);
    
    const proxyConfig = {
      host: PROXY_CONFIG.host,
      port: PROXY_CONFIG.port,
      protocol: PROXY_CONFIG.protocol
    };

    if (PROXY_CONFIG.auth) {
      proxyConfig.auth = PROXY_CONFIG.auth;
    }

    config.proxy = proxyConfig;
    
    // Additional configuration for HTTPS through proxy
    if (PROXY_CONFIG.protocol === 'https') {
      config.httpsAgent = new https.Agent({
        rejectUnauthorized: false
      });
    } else {
      config.httpAgent = new http.Agent();
    }
  }

  return axios.create(config);
}

/**
 * Make a GET request with proxy support
 * @param {string} url - URL to make request to
 * @param {Object} options - Additional options
 * @returns {Promise} - Promise with response
 */
async function get(url, options = {}) {
  const instance = createAxiosInstance(url);
  return instance.get(url, options);
}

/**
 * Make a POST request with proxy support
 * @param {string} url - URL to make request to
 * @param {Object} data - Data to send
 * @param {Object} options - Additional options
 * @returns {Promise} - Promise with response
 */
async function post(url, data = {}, options = {}) {
  const instance = createAxiosInstance(url);
  return instance.post(url, data, options);
}

/**
 * Check if proxy is configured and working
 * @returns {Promise<boolean>} - True if proxy is working
 */
async function testProxy() {
  if (!PROXY_CONFIG.enabled) {
    console.log('Proxy is not enabled');
    return false;
  }

  try {
    console.log('Testing proxy connection...');
    const testUrl = 'https://api.themoviedb.org/3/configuration';
    const response = await get(testUrl);
    console.log('Proxy working correctly');
    return true;
  } catch (error) {
    console.error('Error testing proxy:', error.message);
    return false;
  }
}

module.exports = {
  get,
  post,
  shouldUseProxy,
  createAxiosInstance,
  testProxy,
  PROXY_CONFIG
}; 