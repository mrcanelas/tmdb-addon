require("dotenv").config();
const { MovieDb } = require("moviedb-promise");
const moviedb = new MovieDb(process.env.TMDB_API);

let languageData = null; // We will cache the data here

/**
 * Fetches and caches the full language data from TMDB.
 * This is the single source of truth for all language info.
 */
async function loadLanguageData() {
  if (languageData) return languageData;

  try {
    const [primaryTranslations, allLanguages] = await Promise.all([
      moviedb.primaryTranslations(),
      moviedb.languages(),
    ]);

    // Create a fast lookup map: 'en' -> { english_name: 'English', iso_639_2: 'eng' }
    const languageMap = new Map(
      allLanguages.map(lang => [lang.iso_639_1, { name: lang.english_name, code3: lang.iso_639_2 }])
    );

    // Filter and format the list of available translations
    const availableLanguages = primaryTranslations.map((translationCode) => {
      const [langCode2] = translationCode.split("-");
      const details = languageMap.get(langCode2);
      return details ? { iso_639_1: translationCode, name: details.name } : null;
    }).filter(Boolean);

    languageData = {
      availableLanguages,
      languageMap
    };
    return languageData;
  } catch (error) {
    console.error("Error fetching language data from TMDB:", error.message);
    // Provide a safe fallback
    return {
      availableLanguages: [{ iso_639_1: 'en-US', name: 'English' }],
      languageMap: new Map([['en', { name: 'English', code3: 'eng' }]])
    };
  }
}

/**
 * Returns the list of languages for the addon configuration page.
 */
async function getLanguageListForConfig() {
  const data = await loadLanguageData();
  return data.availableLanguages;
}

/**
 * Converts a 2-letter based language code (e.g., 'pt-BR') to the 3-letter code for TVDB.
 * @param {string} langCode2 The 2-letter code (e.g., 'pt').
 * @returns {string} The 3-letter code, defaulting to 'eng'.
 */
async function to3LetterCode(langCode2) {
  const data = await loadLanguageData();
  const details = data.languageMap.get(langCode2);
  return details?.code3 || 'eng'; // Default to English if not found
}

module.exports = { getLanguageListForConfig, to3LetterCode };
