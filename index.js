const express = require("express");
const { getCatalog } = require("./lib/getCatalog");
const { getSearch } = require("./lib/getSearch");
const { getGenres } = require("./lib/getGenres");
const { getManifest, DEFAULT_LANGUAGE } = require("./lib/getManifest");
const { getMeta } = require("./lib/getMeta");
const { getTmdb } = require("./lib/getTmdb");
const { cacheWrapMeta } = require("./lib/getCache");
const landingTemplate = require("./lib/getTemplate");
const addon = express();
const path = require("path");

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

addon.get("/", async function (_, res) {
  res.redirect("/configure");
});

addon.get("/:language?/configure", async function (req, res) {
  const language = req.params.language || DEFAULT_LANGUAGE;
  const manifest = await getManifest(language);
  const landingHTML = await landingTemplate(manifest);
  res.setHeader("Content-Type", "text/html; charset=UTF-8")
  res.send(landingHTML);
});

addon.get("/:language?/manifest.json", async function (req, res) {
  const language = req.params.language || DEFAULT_LANGUAGE;
  const manifest = await getManifest(language);
  const cacheOpts = {
    cacheMaxAge: 12 * 60 * 60, // 12 hours
    staleRevalidate: 14 * 24 * 60 * 60, // 14 days
    staleError: 30 * 24 * 60 * 60, // 30 days
  };
  respond(res, manifest, cacheOpts);
});

addon.get("/:language?/catalog/:type/:id.json", async function (req, res) {
  const language = req.params.language || DEFAULT_LANGUAGE;
  const type = req.params.type;
  const metas = await getCatalog(type, language)
  const cacheOpts = {
    cacheMaxAge: 2 * 24 * 60 * 60, // 2 days
    staleRevalidate: 14 * 24 * 60 * 60, // 14 days
    staleError: 30 * 24 * 60 * 60, // 30 days
  };
  respond(res, {metas}, cacheOpts);
});

addon.get("/:language?/catalog/:type/:id/skip=:skip.json", async function (req, res) {
  const language = req.params.language || DEFAULT_LANGUAGE;
  const type = req.params.type;
  const page = Math.ceil(req.params.skip / 20 + 1) || 1;
  const metas = await getCatalog(type, language, page)
  const cacheOpts = {
    cacheMaxAge: 1 * 24 * 60 * 60, // 1 days
    staleRevalidate: 14 * 24 * 60 * 60, // 14 days
    staleError: 30 * 24 * 60 * 60, // 30 days
  };
  respond(res, {metas}, cacheOpts);
  }
);

addon.get("/:language?/catalog/:type/:id/search=:query.json", async function (req, res) {
  const language = req.params.language || DEFAULT_LANGUAGE;
  const type = req.params.type;
  const query = req.params.query;
  const resp = await getSearch(type, language, query);
  const cacheOpts = {
    cacheMaxAge: 3 * 24 * 60 * 60, // 3 days
    staleRevalidate: 14 * 24 * 60 * 60, // 14 days
    staleError: 30 * 24 * 60 * 60, // 30 days
  };
  respond(res, resp, cacheOpts);
  }
);

addon.get("/:language?/catalog/:type/:id/genre=:genre.json", async function (req, res) {
  const language = req.params.language || DEFAULT_LANGUAGE;
  const type = req.params.type;
  const [genre, num] = req.params.genre.split("&");
  const page = Math.ceil(num === undefined ? undefined : num.replace(/([^\d])+/gim, "") / 20 + 1) || 1;
  const metas = await getGenres(type, language, genre, page)
  const cacheOpts = {
    cacheMaxAge: 2 * 24 * 60 * 60, // 2 days
    staleRevalidate: 14 * 24 * 60 * 60, // 14 days
    staleError: 30 * 24 * 60 * 60, // 30 days
  };
  respond(res, {metas}, cacheOpts);
  }
);

addon.get("/:language?/meta/:type/:id.json", async function (req, res) {
  if (req.params.id.includes("tmdb:")) {
    const language = req.params.language || DEFAULT_LANGUAGE;
    const type = req.params.type;
    const tmdbId = req.params.id.split(":")[1];
    const resp = await cacheWrapMeta(`${language}:${tmdbId}`, async () => {
      return await getMeta(type, language, tmdbId)
    })
    const cacheOpts = {
      staleRevalidate: 20 * 24 * 60 * 60, // 20 days
      staleError: 30 * 24 * 60 * 60, // 30 days
    };
    if (type == "movie") {
      // cache movies for 14 days:
      cacheOpts.cacheMaxAge = 14 * 24 * 60 * 60;
    } else if (type == "series") {
      const hasEnded = !!((resp.releaseInfo || "").length > 5);
      // cache series that ended for 14 days, otherwise 1 day:
      cacheOpts.cacheMaxAge = (hasEnded ? 14 : 1) * 24 * 60 * 60;
    }
    respond(res, resp, cacheOpts);
  }
  if (req.params.id.includes("tt")) {
    const imdbId = req.params.id.split(":")[0]
    const language = req.params.language || DEFAULT_LANGUAGE;
    const type = req.params.type;
    const tmdbId = await getTmdb(type, imdbId)
    if(tmdbId) {
    const resp = await cacheWrapMeta(`${language}:${tmdbId}`, async () => {
      return await getMeta(type, language, tmdbId)
    })
    const cacheOpts = {
      staleRevalidate: 20 * 24 * 60 * 60, // 20 days
      staleError: 30 * 24 * 60 * 60, // 30 days
    };
    if (type == "movie") {
      // cache movies for 14 days:
      cacheOpts.cacheMaxAge = 14 * 24 * 60 * 60;
    } else if (type == "series") {
      const hasEnded = !!((resp.releaseInfo || "").length > 5);
      // cache series that ended for 14 days, otherwise 1 day:
      cacheOpts.cacheMaxAge = (hasEnded ? 14 : 1) * 24 * 60 * 60;
    }
    respond(res, resp, cacheOpts);
    } else {
      respond(res, {meta: {}})
    }
  }
});

module.exports = addon;
