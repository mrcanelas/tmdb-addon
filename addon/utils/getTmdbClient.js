require("dotenv").config();
const { TMDBClient } = require("./tmdbClient");

// Default client using env variable (cached for reuse)
let defaultClient = null;

/**
 * Get a TMDB client instance based on config
 * @param {Object} config - Configuration object that may contain tmdbApiKey
 * @returns {TMDBClient} - A TMDB client instance
 * @throws {Error} - If no API key is available
 */
function getTmdbClient(config = {}) {
    const userApiKey = config.tmdbApiKey;
    const envApiKey = process.env.TMDB_API;
    const apiKey = userApiKey || envApiKey;

    if (!apiKey) {
        const error = new Error("TMDB_API_KEY_MISSING");
        error.userMessage = "Per utilizzare questo addon è necessaria una TMDB API Key. " +
            "Inseriscila nella pagina di configurazione dell'addon oppure contatta l'amministratore del server.";
        error.statusCode = 401;
        throw error;
    }

    // If using user-provided key, create a new client each time
    // (different users may have different keys)
    if (userApiKey) {
        return new TMDBClient(userApiKey);
    }

    // Otherwise use/create the default cached client
    if (!defaultClient) {
        defaultClient = new TMDBClient(envApiKey);
    }

    return defaultClient;
}

module.exports = { getTmdbClient };
