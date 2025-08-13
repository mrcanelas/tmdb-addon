const axios = require("axios");
const { getMeta } = require("../lib/getMeta");

async function fetchMDBListItems(listId, apiKey, language, page) {
    const offset = (page * 20) - 20;
  try {
    const url = `https://api.mdblist.com/lists/${listId}/items?language=${language}&limit=20&offset=${offset}&apikey=${apiKey}&append_to_response=genre,poster`;
    const response = await axios.get(url);
    return [
      ...(response.data.movies || []),
      ...(response.data.shows || [])
    ];
  } catch (err) {
    console.error("Error retrieving MDBList items:", err.message, err);
    return [];
  }
}

async function getGenresFromMDBList(listId, apiKey) {
  try {
    const items = await fetchMDBListItems(listId, apiKey);
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

async function parseMDBListItems(items, type, genreFilter, language, rpdbkey) {
  const availableGenres = [
    ...new Set(
      items.flatMap(item =>
        (item.genre || [])
          .map(g =>
            typeof g === "string"
              ? g.charAt(0).toUpperCase() + g.slice(1).toLowerCase()
              : null
          )
          .filter(Boolean)
      )
    )
  ].sort();

  let filteredItems = items;
  if (genreFilter) {
    filteredItems = filteredItems.filter(item =>
      Array.isArray(item.genre) &&
      item.genre.some(
        g =>
          typeof g === "string" &&
          g.toLowerCase() === genreFilter.toLowerCase()
      )
    );
  }

  const filteredItemsByType = filteredItems
    .filter(item => {
      if (type === "series") return item.mediatype === "show";
      if (type === "movie") return item.mediatype === "movie";
      return false;
    })
    .map(item => ({
      id: item.id,
      type: type
    }));

  const metaPromises = filteredItemsByType.map(item => 
    getMeta(item.type, language, item.id, rpdbkey)
      .then(result => result.meta)
      .catch(err => {
        console.error(`Error fetching metadata for ${item.id}:`, err.message);
        return null;
      })
  );

  const metas = (await Promise.all(metaPromises)).filter(Boolean);

  return { metas, availableGenres };
}

module.exports = { fetchMDBListItems, getGenresFromMDBList, parseMDBListItems };