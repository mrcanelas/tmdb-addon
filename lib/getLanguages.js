import "dotenv/config"
import { MovieDb } from "moviedb-promise";
const moviedb = new MovieDb(process.env.tmdb_api);

async function getLanguages() {
  const [primaryTranslations, languages] = await Promise.all([
    moviedb.primaryTranslations(),
    moviedb.languages(),
  ]);
  return primaryTranslations.map((element) => {
    const [language, country] = element.split("-");
    const findLanguage = languages.find(({ iso_639_1 }) => iso_639_1 === language);
    return { iso_639_1: element, name: findLanguage.english_name };
  });
}

export default getLanguages;
