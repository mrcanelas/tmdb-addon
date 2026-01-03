const express = require("express");
const favicon = require('serve-favicon');
const path = require("path")
const addon = express();
const analytics = require('./utils/analytics');
const { getCatalog } = require("./lib/getCatalog");
const { getSearch } = require("./lib/getSearch");
const { getManifest, DEFAULT_LANGUAGE } = require("./lib/getManifest");
const { getMeta } = require("./lib/getMeta");
const { getTmdb } = require("./lib/getTmdb");
const { cacheWrapMeta } = require("./lib/getCache");
const { getTrending } = require("./lib/getTrending");
const { parseConfig, getRpdbPoster } = require("./utils/parseProps");
const { getRequestToken, getSessionId } = require("./lib/getSession");
const { getFavorites, getWatchList } = require("./lib/getPersonalLists");
const { getTraktAuthUrl, getTraktAccessToken } = require("./lib/getTraktSession");
const { getTraktWatchlist, getTraktRecommendations } = require("./lib/getTraktLists");
const { blurImage } = require('./utils/imageProcessor');
const { testProxy, PROXY_CONFIG } = require('./utils/httpClient');

addon.use(analytics.middleware);
addon.use(favicon(path.join(__dirname, '../public/favicon.png')));
addon.use(express.static(path.join(__dirname, '../public')));
addon.use(express.static(path.join(__dirname, '../dist')));

const getCacheHeaders = function (opts) {
  opts = opts || {};

  if (!Object.keys(opts).length) return false;

  let cacheHeaders = {
    cacheMaxAge: "max-age",
    staleRevalidate: "stale-while-revalidate",
    staleError: "stale-if-error",
  };

  return Object.keys(cacheHeaders)
    .map((prop) => {
      const value = opts[prop];
      if (!value) return false;
      return cacheHeaders[prop] + "=" + value;
    })
    .filter((val) => !!val)
    .join(", ");
};

const respond = function (res, data, opts) {
  const cacheControl = getCacheHeaders(opts);
  if (cacheControl) res.setHeader("Cache-Control", `${cacheControl}, public`);
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "*");
  res.setHeader("Content-Type", "application/json");
  res.send(data);
};

addon.get("/", function (_, res) {
  res.redirect("/configure");
});

addon.get("/request_token", async function (req, res) {
  try {
    const response = await getRequestToken()

    // Verifica se houve erro na requisição
    if (response?.success === false) {
      res.status(400).json({ error: response.status_message || 'Failed to get request token' });
      return;
    }

    // Retorna apenas o request_token string, não o objeto inteiro
    const requestToken = response?.request_token;
    if (!requestToken) {
      res.status(500).json({ error: 'Request token not found in response' });
      return;
    }

    respond(res, requestToken);
  } catch (error) {
    console.error('Error getting request token:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

addon.get("/session_id", async function (req, res) {
  try {
    const requestToken = req.query.request_token;

    if (!requestToken) {
      res.status(400).json({ error: 'Request token is required' });
      return;
    }

    const response = await getSessionId(requestToken);

    // Verifica se houve erro na requisição
    if (response?.success === false) {
      res.status(400).json({ error: response.status_message || 'Failed to create session' });
      return;
    }

    // Retorna apenas o session_id string, não o objeto inteiro
    const sessionId = response?.session_id;
    if (!sessionId) {
      res.status(500).json({ error: 'Session ID not found in response' });
      return;
    }

    respond(res, sessionId);
  } catch (error) {
    console.error('Error getting session ID:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

addon.get("/trakt_auth_url", async function (req, res) {
  try {
    // Detecta o host da requisição atual (suporta proxies reversos)
    let protocol = req.protocol;
    if (!protocol || protocol === 'http') {
      // Verifica headers de proxy reverso
      const forwardedProto = req.headers['x-forwarded-proto'];
      if (forwardedProto) {
        protocol = forwardedProto.split(',')[0].trim();
      } else if (req.secure || req.headers['x-forwarded-ssl'] === 'on') {
        protocol = 'https';
      }
    }

    const host = req.get('host') || req.headers.host || req.headers['x-forwarded-host'];
    const requestHost = process.env.HOST_NAME || `${protocol}://${host}`;

    const { authUrl, state } = await getTraktAuthUrl(requestHost);
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Headers", "*");
    res.setHeader("Content-Type", "application/json");
    res.json({ authUrl, state });
  } catch (error) {
    console.error('Error getting Trakt auth URL:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

addon.get("/trakt_access_token", async function (req, res) {
  try {
    const code = req.query.code;

    if (!code) {
      res.status(400).json({ error: 'Authorization code is required' });
      return;
    }

    // Detecta o redirect_uri da requisição (o Trakt envia de volta o mesmo que foi usado)
    // Ou usa o host atual para construir (suporta proxies reversos)
    let protocol = req.protocol;
    if (!protocol || protocol === 'http') {
      // Verifica headers de proxy reverso
      const forwardedProto = req.headers['x-forwarded-proto'];
      if (forwardedProto) {
        protocol = forwardedProto.split(',')[0].trim();
      } else if (req.secure || req.headers['x-forwarded-ssl'] === 'on') {
        protocol = 'https';
      }
    }

    const host = req.get('host') || req.headers.host || req.headers['x-forwarded-host'];
    const requestHost = process.env.HOST_NAME || `${protocol}://${host}`;
    // Usa o mesmo redirect_uri que foi usado na autenticação (oauth-callback)
    const redirectUri = `${requestHost}/configure/oauth-callback`;

    const response = await getTraktAccessToken(code, redirectUri);

    // Verifica se houve erro na requisição
    if (response?.error || response?.success === false) {
      res.status(400).json({ error: response.error || response.status_message || 'Failed to get access token' });
      return;
    }

    // Retorna o objeto com access_token, refresh_token, etc.
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Headers", "*");
    res.setHeader("Content-Type", "application/json");
    res.json(response);
  } catch (error) {
    console.error('Error getting Trakt access token:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

// Serve arquivos estáticos do React app
addon.use('/configure', express.static(path.join(__dirname, '../dist'), {
  fallthrough: true // Continua para a próxima rota se não encontrar o arquivo
}));

addon.use('/configure', (req, res, next) => {
  const config = parseConfig(req.params.catalogChoices) || {};
  next();
});

// Rota para /configure (sem sub-rotas)
addon.get('/configure', function (req, res) {
  res.sendFile(path.join(__dirname, '../dist/index.html'));
});

// Rota catch-all para servir o React app em todas as rotas /configure/*
// Usa * para capturar qualquer coisa após /configure/
addon.get(/^\/configure\/.+$/, function (req, res) {
  res.sendFile(path.join(__dirname, '../dist/index.html'));
});

addon.get('/:catalogChoices?/configure', function (req, res) {
  res.sendFile(path.join(__dirname, '../dist/index.html'));
});

addon.get("/:catalogChoices?/manifest.json", async function (req, res) {
  const { catalogChoices } = req.params;
  const config = parseConfig(catalogChoices) || {};
  const manifest = await getManifest(config);

  const cacheOpts = {
    cacheMaxAge: 12 * 60 * 60,
    staleRevalidate: 14 * 24 * 60 * 60,
    staleError: 30 * 24 * 60 * 60,
  };
  respond(res, manifest, cacheOpts);
});

addon.get("/:catalogChoices?/catalog/:type/:id/:extra?.json", async function (req, res) {
  const { catalogChoices, type, id, extra } = req.params;
  const config = parseConfig(catalogChoices) || {};
  const language = config.language || DEFAULT_LANGUAGE;
  const sessionId = config.sessionId;
  const { genre, skip, search } = extra
    ? Object.fromEntries(
      new URLSearchParams(req.url.split("/").pop().split("?")[0].slice(0, -5)).entries()
    )
    : {};
  const page = Math.ceil(skip ? skip / 20 + 1 : undefined) || 1;
  let metas = [];
  try {
    const args = [type, language, page];

    if (search) {
      metas = await getSearch(id, type, language, search, config);
    } else {
      switch (id) {
        case "tmdb.trending":
          metas = await getTrending(...args, genre, config);
          break;
        case "tmdb.favorites":
          metas = await getFavorites(...args, genre, config);
          break;
        case "tmdb.watchlist":
          metas = await getWatchList(...args, genre, config);
          break;
        case "trakt.watchlist":
          const traktAccessToken = config.traktAccessToken;
          if (!traktAccessToken) {
            throw new Error('Trakt access token não fornecido');
          }
          metas = await getTraktWatchlist(...args, genre, traktAccessToken);
          break;
        case "trakt.recommendations":
          const traktToken = config.traktAccessToken;
          if (!traktToken) {
            throw new Error('Trakt access token não fornecido');
          }
          metas = await getTraktRecommendations(...args, genre, traktToken);
          break;
        default:
          metas = await getCatalog(...args, id, genre, config);
          break;
      }
    }
  } catch (e) {
    // Handle missing TMDB API key error
    if (e.message === "TMDB_API_KEY_MISSING") {
      res.status(e.statusCode || 401).json({
        error: e.userMessage || "TMDB API Key is required",
        code: "TMDB_API_KEY_MISSING"
      });
      return;
    }
    res.status(404).send((e || {}).message || "Not found");
    return;
  }
  const cacheOpts = {
    cacheMaxAge: 1 * 24 * 60 * 60,
    staleRevalidate: 7 * 24 * 60 * 60,
    staleError: 14 * 24 * 60 * 60,
  };
  respond(res, metas, cacheOpts);
});

addon.get("/:catalogChoices?/meta/:type/:id.json", async function (req, res) {
  const { catalogChoices, type, id } = req.params;
  const config = parseConfig(catalogChoices) || {};
  const tmdbId = id.split(":")[1];
  const language = config.language || DEFAULT_LANGUAGE;
  const imdbId = req.params.id.split(":")[0];
  delete config.catalogs
  delete config.streaming

  if (req.params.id.includes("tmdb:")) {
    // Validate that tmdbId is numeric
    if (!/^\d+$/.test(tmdbId)) {
      res.status(404).json({ error: "Invalid TMDB ID" });
      return;
    }

    try {
      const resp = await cacheWrapMeta(`${language}:${type}:${tmdbId}`, async () => {
        return await getMeta(type, language, tmdbId, config);
      });
      const cacheOpts = {
        staleRevalidate: 20 * 24 * 60 * 60,
        staleError: 30 * 24 * 60 * 60,
      };
      if (type == "movie") {
        cacheOpts.cacheMaxAge = 14 * 24 * 60 * 60;
      } else if (type == "series") {
        const hasEnded = !!((resp.releaseInfo || "").length > 5);
        cacheOpts.cacheMaxAge = (hasEnded ? 14 : 1) * 24 * 60 * 60;
      }
      respond(res, resp, cacheOpts);
    } catch (e) {
      // Handle missing TMDB API key error
      if (e.message === "TMDB_API_KEY_MISSING") {
        res.status(e.statusCode || 401).json({
          error: e.userMessage || "TMDB API Key is required",
          code: "TMDB_API_KEY_MISSING"
        });
        return;
      }
      if (e.message && (e.message.includes("404") || e.message.toLowerCase().includes("not found"))) {
        res.status(404).json({ error: "Content not found on TMDB" });
      } else {
        console.error(`Error in meta route for ${type} ${tmdbId}:`, e);
        res.status(500).json({ error: "Internal server error" });
      }
    }
  }
  if (req.params.id.includes("tt")) {
    const tmdbId = await getTmdb(type, imdbId, config);
    if (tmdbId) {
      const resp = await cacheWrapMeta(`${language}:${type}:${tmdbId}`, async () => {
        return await getMeta(type, language, tmdbId, config);
      });
      const cacheOpts = {
        staleRevalidate: 20 * 24 * 60 * 60,
        staleError: 30 * 24 * 60 * 60,
      };
      if (type == "movie") {
        cacheOpts.cacheMaxAge = 14 * 24 * 60 * 60;
      } else if (type == "series") {
        const hasEnded = !!((resp.releaseInfo || "").length > 5);
        cacheOpts.cacheMaxAge = (hasEnded ? 14 : 1) * 24 * 60 * 60;
      }
      respond(res, resp, cacheOpts);
    } else {
      respond(res, { meta: {} });
    }
  }
});

addon.get("/api/proxy/status", async function (req, res) {
  try {
    const proxyStatus = {
      enabled: PROXY_CONFIG.enabled,
      host: PROXY_CONFIG.host,
      port: PROXY_CONFIG.port,
      protocol: PROXY_CONFIG.protocol,
      working: false
    };

    if (PROXY_CONFIG.enabled) {
      proxyStatus.working = await testProxy();
    }

    respond(res, proxyStatus);
  } catch (error) {
    console.error('Error checking proxy status:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

addon.get("/api/image/blur", async function (req, res) {
  const imageUrl = req.query.url;

  if (!imageUrl) {
    return res.status(400).json({ error: 'Image URL not provided' });
  }

  try {
    const blurredImageBuffer = await blurImage(imageUrl);

    if (!blurredImageBuffer) {
      return res.status(500).json({ error: 'Error processing image' });
    }

    res.setHeader('Content-Type', 'image/jpeg');
    res.setHeader('Cache-Control', 'public, max-age=31536000');

    res.send(blurredImageBuffer);
  } catch (error) {
    console.error('Error in blur route:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = addon;