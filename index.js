const express = require("express");
const { getCatalog } = require("./lib/getCatalog");
const { getSearch } = require("./lib/getSearch");
const { getGenres } = require("./lib/getGenres");
const { getManifest } = require("./lib/getManifest");
const { getMeta } = require("./lib/getMeta");
const addon = express();

var respond = function (res, data) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', '*');
  res.setHeader('Content-Type', 'application/json');
  res.send(data);
};

addon.get("/:language/manifest.json", async function (req, res) {
  const language = req.params.language
  const resp = await getManifest(language)
  respond(res, resp);
});

addon.get("/:language/catalog/:type/:id.json", async function (req, res) {
	const language = req.params.language
	const type = req.params.type
  const resp = await getCatalog(type, language)
	respond(res, resp);
});

addon.get("/:language/catalog/:type/:id/skip=:skip.json", async function (req, res) {
	const language = req.params.language
  const type = req.params.type
  const page = req.params.skip / 20 + 1
  const resp = await getCatalog(type, language, page)
	respond(res, resp);
});

addon.get("/:language/catalog/:type/:id/search=:query.json", async function (req, res) {
	const language = req.params.language
  const type = req.params.type
  const query = req.params.query
  const resp = await getSearch(type, language, query)
	respond(res, resp);
});

addon.get("/:language/catalog/:type/:id/genre=:genre.json", async function (req, res) {
	const language = req.params.language
  const type = req.params.type
  const genre = req.params.genre
  const resp = await getGenres(type, language, genre)
	respond(res, resp);
});

addon.get('/:language/catalog/:type/:id/genre=:genre:&skip=:skip.json', async function (req, res) {
	const language = req.params.language
  const type = req.params.type
  const genre = req.query.genre
  const page = req.query.skip / 20 + 1
  const resp = await getGenres(type, language, genre, page)
  respond(res, resp);
});

addon.get("/:language/meta/:type/:id.json", async function (req, res) {
	const language = req.params.language
  const type = req.params.type
  const [idPrefixes, tmdbId] = req.params.id.split(":");
  const resp = await getMeta(type, language, tmdbId)
	respond(res, resp);
});

module.exports = addon;
