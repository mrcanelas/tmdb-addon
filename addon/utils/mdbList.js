const axios = require("axios");
const { getMeta } = require("../lib/getMeta"); 

async function fetchMDBListItems(listId, apiKey, language, page) {
    const offset = (page * 20) - 20;
  try {
    const url = `https://api.mdblist.com/lists/${listId}/items?language=${language}&limit=20&offset=${offset}&apikey=${apiKey}`;
    const response = await axios.get(url);
    return [
      ...(response.data.movies || []),
      ...(response.data.shows || [])
    ];
  } catch (err) {
    console.error("Error retrieving MDBList items:", err.message);
    return [];
  }
}

async function getGenresFromMDBList(listId, apiKey) {
  try {
    const items = await fetchMDBListItems(listId, apiKey, 'en-US', 1);
    const genres = [
      ...new Set(
        items.flatMap(item =>
          (item.genre || []).map(g => {
            if (!g || typeof g !== "string") return null;
            return g.charAt(0).toUpperCase() + g.slice(1).toLowerCase();
          })
        ).filter(Boolean)
      )
    ].sort();
    return genres;
  } catch(err) {
    console.error("ERROR in getGenresFromMDBList:", err);
    return [];
  }
}


async function parseMDBListItems(items, type, genreFilter, language, config) {
  let filteredItems = items;
  if (genreFilter) {
    filteredItems = filteredItems.filter(item =>
      Array.isArray(item.genre) &&
      item.genre.some(g => typeof g === "string" && g.toLowerCase() === genreFilter.toLowerCase())
    );
  }

  const targetMediaType = type === 'series' ? 'show' : 'movie';

  const metaPromises = filteredItems
    .filter(item => item.mediatype === targetMediaType)
    .map(item => 
      getMeta(type, language, `tmdb:${item.id}`, config)
        .then(result => result.meta)
        .catch(err => {
          console.error(`Error fetching metadata for MDBList item tmdb:${item.id}:`, err.message);
          return null;
        })
  );

  const metas = (await Promise.all(metaPromises)).filter(Boolean);

  return { metas };
}

module.exports = { fetchMDBListItems, getGenresFromMDBList, parseMDBListItems };
