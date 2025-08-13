require("dotenv").config();
const { TMDBClient } = require("../utils/tmdbClient");
const moviedb = new TMDBClient(process.env.TMDB_API);
const { getGenreList } = require("./getGenreList");
const { parseMedia } = require("../utils/parseProps");
const translations = require("../static/translations.json");

function getAllTranslations(key) {
    return Object.values(translations).map(lang => lang[key]).filter(Boolean);
}

const API_FIELD_MAPPING = {
    'added_date': 'created_at',
    'popularity': 'popularity',
    'release_date': 'release_date'
};

function sortResults(results, genre) {
    if (!genre) return results;

    let sortedResults = [...results];
    
    const randomTranslations = getAllTranslations('random');
    if (randomTranslations.includes(genre)) {
        return shuffleArray(sortedResults);
    }

    let field, order;
    
    const fields = {
        'added_date': getAllTranslations('added_date'),
        'popularity': getAllTranslations('popularity'),
        'release_date': getAllTranslations('release_date')
    };

    for (const [fieldName, translations] of Object.entries(fields)) {
        if (translations.some(t => genre.includes(t))) {
            field = fieldName;
            break;
        }
    }

    if (!field) return sortedResults;

    const ascTranslations = getAllTranslations('asc');
    const descTranslations = getAllTranslations('desc');

    if (ascTranslations.some(t => genre.includes(t))) {
        order = 'asc';
    } else if (descTranslations.some(t => genre.includes(t))) {
        order = 'desc';
    } else {
        return sortedResults;
    }

    sortedResults.sort((a, b) => {
        let valueA, valueB;
        
        switch (field) {
            case 'release_date':
                valueA = a.release_date || a.first_air_date;
                valueB = b.release_date || b.first_air_date;
                break;
            case 'popularity':
                valueA = a.popularity;
                valueB = b.popularity;
                break;
            case 'added_date':
            default:
                return 0;
        }

        if (order === 'asc') {
            return valueA < valueB ? -1 : 1;
        }
        return valueA > valueB ? -1 : 1;
    });

    return sortedResults;
}

function configureSortingParameters(parameters, genre) {
    const fields = {
        'added_date': getAllTranslations('added_date'),
        'popularity': getAllTranslations('popularity'),
        'release_date': getAllTranslations('release_date')
    };

    for (const [fieldName, translations] of Object.entries(fields)) {
        if (translations.some(t => genre?.includes(t))) {
            const ascTranslations = getAllTranslations('asc');
            const descTranslations = getAllTranslations('desc');
            
            if (ascTranslations.some(t => genre.includes(t))) {
                parameters.sort_by = `${API_FIELD_MAPPING[fieldName]}.asc`;
            } else if (descTranslations.some(t => genre.includes(t))) {
                parameters.sort_by = `${API_FIELD_MAPPING[fieldName]}.desc`;
            }
            break;
        }
    }
    return parameters;
}

async function getFavorites(type, language, page, genre, sessionId) {
    moviedb.sessionId = sessionId;
    let parameters = { language, page };
    parameters = configureSortingParameters(parameters, genre);

    const genreList = await getGenreList(language, type);
    const fetchFunction = type === "movie" ? moviedb.accountFavoriteMovies.bind(moviedb) : moviedb.accountFavoriteTv.bind(moviedb);

    return fetchFunction(parameters)
        .then((res) => ({
            metas: sortResults(res.results, genre).map(el => parseMedia(el, type, genreList))
        }))
        .catch(console.error);
}

async function getWatchList(type, language, page, genre, sessionId) {
    moviedb.sessionId = sessionId;
    let parameters = { language, page };
    parameters = configureSortingParameters(parameters, genre);

    const genreList = await getGenreList(language, type);
    const fetchFunction = type === "movie" ? moviedb.accountMovieWatchlist.bind(moviedb) : moviedb.accountTvWatchlist.bind(moviedb);

    return fetchFunction(parameters)
        .then((res) => ({
            metas: sortResults(res.results, genre).map(el => parseMedia(el, type, genreList))
        }))
        .catch(console.error);
}

function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

module.exports = { getFavorites, getWatchList };