const express = require("express");
const { getCatalog } = require("./lib/getCatalog");
const { getSearch } = require("./lib/getSearch");
const { getGenres } = require("./lib/getGenres");
const { getManifest, DEFAULT_LANGUAGE } = require("./lib/getManifest");
const { getMeta } = require("./lib/getMeta");
const addon = express();
const path = require('path');

const respond = function (res, data) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', '*');
  res.setHeader('Content-Type', 'application/json');
  res.send(data);
};

addon.get("/", async function (req, res) {
  res.redirect("/configure")
});

addon.get("/:language?/configure", async function (req, res) {
  res.sendFile(path.join(__dirname+'/configure.html'));
});

addon.get("/:language?/manifest.json", async function (req, res) {
  const language = req.params.language || DEFAULT_LANGUAGE
  const resp = await getManifest(language)
  respond(res, resp);
});

addon.get("/:language?/catalog/:type/:id.json", async function (req, res) {
	const language = req.params.language || DEFAULT_LANGUAGE
  const type = req.params.type
  const resp = await getCatalog(type, language)
	respond(res, resp);
});

addon.get("/:language?/catalog/:type/:id/skip=:skip.json", async function (req, res) {
	const language = req.params.language || DEFAULT_LANGUAGE
  const type = req.params.type
  const page = req.params.skip / 20 + 1
  const resp = await getCatalog(type, language, page)
	respond(res, resp);
});

addon.get("/:language?/catalog/:type/:id/search=:query.json", async function (req, res) {
	const language = req.params.language || DEFAULT_LANGUAGE
  const type = req.params.type
  const query = req.params.query
  const resp = await getSearch(type, language, query)
	respond(res, resp);
});

addon.get("/:language?/catalog/:type/:id/genre=:genre.json", async function (req, res) {
	const language = req.params.language || DEFAULT_LANGUAGE
  const type = req.params.type
  const [genre, num] = req.params.genre.split("&")
  const page = (num === undefined) ? undefined : (num.replace(/([^\d])+/gim, '')) / 20 + 1
  const resp = await getGenres(type, language, genre, page)
	respond(res, resp);
});

addon.get("/:language?/meta/:type/:id.json", async function (req, res) {
	const language = req.params.language || DEFAULT_LANGUAGE
  const type = req.params.type
  const tmdbId = req.params.id.split(":")[1];
  const resp = await getMeta(type, language, tmdbId)
	respond(res, resp);
});

module.exports = addon;
