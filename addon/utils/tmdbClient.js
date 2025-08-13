const { MovieDb } = require('moviedb-promise');
const { createAxiosInstance } = require('./httpClient');

/**
 * Custom TMDB client with proxy support
 */
class TMDBClient extends MovieDb {
  constructor(apiKey) {
    super(apiKey);
    
    // Replace default request method
    this._request = async (url, options = {}) => {
      const instance = createAxiosInstance(url);
      
      try {
        const response = await instance.request({
          url,
          method: options.method || 'GET',
          data: options.data,
          params: options.params,
          headers: options.headers,
          ...options
        });
        
        return response.data;
      } catch (error) {
        console.error(`Error in TMDB request for ${url}:`, error.message);
        throw error;
      }
    };
  }

  /**
   * Override request method to use our custom HTTP client
   */
  async request(url, options = {}) {
    return this._request(url, options);
  }
}

module.exports = { TMDBClient }; 