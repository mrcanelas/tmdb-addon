import express from "express";
import urlExist from "url-exist";
import path, { dirname } from "path";
import { fileURLToPath } from 'url';
import getCatalog from "./lib/getCatalog.js"
import getSearch from "./lib/getSearch.js";
import { getManifest, DEFAULT_LANGUAGE } from "./lib/getManifest.js";
import getMeta from "./lib/getMeta.js";
import getTmdb from "./lib/getTmdb.js";
import getTrending from "./lib/getTrending.js";
import Utils from "./utils/parseProps.js";
const addon = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const getCacheHeaders = (opts = {}) => {
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
      return `${cacheHeaders[prop]}=${value}`;
    })
    .filter((val) => !!val)
    .join(", ");
};

const respond = (res, data, opts) => {
  const cacheControl = getCacheHeaders(opts);
  if (cacheControl) res.setHeader("Cache-Control", `${cacheControl}, public`);
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "*");
  res.setHeader("Content-Type", "application/json");
  res.send(data);
};

addon.get("/", async (_, res) => {
  res.redirect("/configure");
});

addon.get("/:catalogChoices?/configure", async (req, res) => {
  res.sendFile(path.join(`${__dirname}/configure.html`));
});

addon.get("/:catalogChoices?/manifest.json", async ({ params }, res) => {
  const config = Utils.parseConfig(params.catalogChoices);
  const language = config.language || DEFAULT_LANGUAGE;
  const manifest = await getManifest(language);
  const cacheOpts = {
    cacheMaxAge: 12 * 60 * 60, // 12 hours
    staleRevalidate: 14 * 24 * 60 * 60, // 14 days
    staleError: 30 * 24 * 60 * 60, // 30 days
  };
  respond(res, manifest, cacheOpts);
});

addon.get("/:catalogChoices?/catalog/:type/:id/:extra?.json", async ({ params, url }, res) => {
  const { catalogChoices, type, id } = params;
  const config = Utils.parseConfig(catalogChoices)
  const language = config.language || DEFAULT_LANGUAGE;
  const include_adult = config.include_adult || false
  const rpdbkey = config.rpdbkey
  const { genre, skip, search } = params.extra
    ? Object.fromEntries(
      new URLSearchParams(url.split("/").pop().split("?")[0].slice(0, -5)).entries()
    )
    : {};
  const page = Math.ceil(skip ? skip / 20 + 1 : undefined) || 1;
  let metas = [];
  try {
    metas = search
      ? await getSearch(type, language, search, include_adult)
      : id === "tmdb.trending"
        ? await getTrending(type, id, language, genre, page)
        : await getCatalog(type, id, language, genre, page);
  } catch (e) {
    res.status(404).send((e || {}).message || "Not found");
    return;
  }
  const cacheOpts = {
    cacheMaxAge: 7 * 24 * 60 * 60, // 7 days
    staleRevalidate: 14 * 24 * 60 * 60, // 14 days
    staleError: 30 * 24 * 60 * 60, // 30 days
  };
  if (id === "tmdb.trending" && genre === "Day") {
    cacheOpts.cacheMaxAge = 1 * 24 * 60 * 60; // 1 day
  }
  if (rpdbkey) {
    // clone response before changing posters
    try {
      metas = JSON.parse(JSON.stringify(metas));
      metas.metas = await Promise.all(metas.metas.map(async (el) => {
        const rpdbPoster = Utils.getRpdbPoster(type, el.id.replace('tmdb:', ''), language, rpdbkey)
        el.poster = (await urlExist(rpdbPoster)) ? rpdbPoster : el.poster;
        return el;
      }))
    } catch (e) { }
  }
  respond(res, metas, cacheOpts);
});

addon.get("/:catalogChoices?/meta/:type/:id.json", async ({ params }, res) => {
  const { catalogChoices, type, id } = params;
  const config = Utils.parseConfig(catalogChoices);
  const tmdbId = id.split(":")[1];
  const language = config.language || DEFAULT_LANGUAGE;
  const imdbId = params.id.split(":")[0];

  if (params.id.includes("tmdb:")) {
    const resp = await getMeta(type, language, tmdbId);
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
  if (params.id.includes("tt")) {
    const tmdbId = await getTmdb(type, imdbId);
    if (tmdbId) {
      const resp = await getMeta(type, language, tmdbId);
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
      respond(res, { meta: {} });
    }
  }
});

export default addon;