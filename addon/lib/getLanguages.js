require("dotenv").config();
const { MovieDb } = require("moviedb-promise");
const moviedb = new MovieDb(process.env.TMDB_API);

async function getLanguages() {
  try {
    
    const [primaryTranslations, languages] = await Promise.all([
      moviedb.primaryTranslations(),
      moviedb.languages(),
    ]);

    const languageMap = new Map(
      languages.map(lang => [lang.iso_639_1, lang.english_name])
    );

    return primaryTranslations.map((translationCode) => {
      const [languageCode] = translationCode.split("-"); 
      const englishName = languageMap.get(languageCode) || 'Unknown'; 

      return { iso_639_1: translationCode, name: englishName };
    }).filter(lang => lang.name !== 'Unknown'); 

  } catch (error) {
    console.error("Error fetching language list from TMDB:", error.message);
    return [{ iso_639_1: 'en-US', name: 'English' }];
  }
}

module.exports = { getLanguages };
