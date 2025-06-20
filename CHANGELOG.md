## [3.1.10](https://github.com/aves-omni/tmdb-addon/compare/v3.1.9...v3.1.10) (2025-06-20)


### Bug Fixes

* configure Git settings in Docker deployment workflow ([6fe7efe](https://github.com/aves-omni/tmdb-addon/commit/6fe7efe6b4d45ba7e8f3dddc6a34f2108456bd5d))

## [3.1.9](https://github.com/aves-omni/tmdb-addon/compare/v3.1.8...v3.1.9) (2025-06-20)


### Bug Fixes

* comment out build context in docker-compose.yml for tmdb-addon service ([91e5881](https://github.com/aves-omni/tmdb-addon/commit/91e58811dece8f20d748af95cdf6506481664b8b))
* update Docker deployment workflow to disable caching during build ([979a5ff](https://github.com/aves-omni/tmdb-addon/commit/979a5ff09f8c5c732ec3933988366fbe2d617082))
* update Docker deployment workflow to include artifact upload and download steps ([6bcf1ed](https://github.com/aves-omni/tmdb-addon/commit/6bcf1ed5073218b88ef201e86c4a274f2a9f968a))

## [3.1.9](https://github.com/aves-omni/tmdb-addon/compare/v3.1.8...v3.1.9) (2025-06-20)


### Bug Fixes

* comment out build context in docker-compose.yml for tmdb-addon service ([91e5881](https://github.com/aves-omni/tmdb-addon/commit/91e58811dece8f20d748af95cdf6506481664b8b))
* update Docker deployment workflow to disable caching during build ([979a5ff](https://github.com/aves-omni/tmdb-addon/commit/979a5ff09f8c5c732ec3933988366fbe2d617082))
* update Docker deployment workflow to include artifact upload and download steps ([6bcf1ed](https://github.com/aves-omni/tmdb-addon/commit/6bcf1ed5073218b88ef201e86c4a274f2a9f968a))

## [3.1.9](https://github.com/aves-omni/tmdb-addon/compare/v3.1.8...v3.1.9) (2025-06-20)


### Bug Fixes

* update Docker deployment workflow to include artifact upload and download steps ([6bcf1ed](https://github.com/aves-omni/tmdb-addon/commit/6bcf1ed5073218b88ef201e86c4a274f2a9f968a))

## [3.1.8](https://github.com/aves-omni/tmdb-addon/compare/v3.1.7...v3.1.8) (2025-06-20)


### Bug Fixes

* update Docker image tag in docker-compose.yml to latest and adjust checkout step in docker-deploy.yml ([71e3259](https://github.com/aves-omni/tmdb-addon/commit/71e3259dd4694dd2839dcd8528e6e79ea4347b6b))

## [3.1.7](https://github.com/aves-omni/tmdb-addon/compare/v3.1.6...v3.1.7) (2025-06-20)


### Bug Fixes

* update Docker image tag in docker-compose.yml to v1.0.0 ([75b0497](https://github.com/aves-omni/tmdb-addon/commit/75b049731ef70b29c008c49591b5eaee5c617abd))

# 1.0.0 (2025-06-20)


### Bug Fixes

* **#73:** catalog enable/disable state and cleanup ([2188577](https://github.com/aves-omni/tmdb-addon/commit/2188577c33c4d9cdd4ba8078ac254c949c4d662e)), closes [#73](https://github.com/aves-omni/tmdb-addon/issues/73) [#73](https://github.com/aves-omni/tmdb-addon/issues/73)
* **#74, #80:** decouple search functionality from popular catalog ([8c2c47a](https://github.com/aves-omni/tmdb-addon/commit/8c2c47a1847810db97b6343f664aba52ce717ce6)), closes [#74](https://github.com/aves-omni/tmdb-addon/issues/74) [#80](https://github.com/aves-omni/tmdb-addon/issues/80) [#74](https://github.com/aves-omni/tmdb-addon/issues/74) [#80](https://github.com/aves-omni/tmdb-addon/issues/80)
* **#78:** improve search functionality for non-latin queries ([a827813](https://github.com/aves-omni/tmdb-addon/commit/a82781319f4b7acecb78a5026e976d239b789dc9)), closes [#78](https://github.com/aves-omni/tmdb-addon/issues/78) [#78](https://github.com/aves-omni/tmdb-addon/issues/78)
* **#79:** correct addon installation protocol ([da62e65](https://github.com/aves-omni/tmdb-addon/commit/da62e65d192d1228ef3ce540a3ccfb345131d880)), closes [#79](https://github.com/aves-omni/tmdb-addon/issues/79) [#79](https://github.com/aves-omni/tmdb-addon/issues/79)
* add extra plugins for semantic release in Docker deployment workflow ([6f4cf9e](https://github.com/aves-omni/tmdb-addon/commit/6f4cf9eacfddac8bd779e0703877507043635834))
* add fallback for untranslated catalog options ([e1bd6cd](https://github.com/aves-omni/tmdb-addon/commit/e1bd6cd2f6e9ae3a13b1c1332d74528177fcdd7f))
* add mdblistkey handling in loadConfigFromUrl ([798e315](https://github.com/aves-omni/tmdb-addon/commit/798e315a5c1fd2c7bab5808bc954f4476dd70f6f))
* add optional chaining to imdbRating ([21b19df](https://github.com/aves-omni/tmdb-addon/commit/21b19df325cb74f346fd85b2e0c929abc8e79fa2))
* adjust genre requirement based on showInHome flag in createMDBListCatalog ([7d13915](https://github.com/aves-omni/tmdb-addon/commit/7d139157eb50a3c1af4569880c5f9454e324a250))
* catalog genre requirement based on home visibility ([ce74258](https://github.com/aves-omni/tmdb-addon/commit/ce742589de5e27d43a99a9a563692b1400dcca2c))
* check runtime on episode_run_time array first ([e7fc429](https://github.com/aves-omni/tmdb-addon/commit/e7fc4291bb5d588ad1fc8572c6fa74eaa1ac0f5f))
* ensure default catalogs are loaded on direct installation ([e72fa88](https://github.com/aves-omni/tmdb-addon/commit/e72fa883d569a29a010b7cc163a318af5869e1f0))
* fetch runtime from last aired episode ([019215b](https://github.com/aves-omni/tmdb-addon/commit/019215bde44e14f15c4376ba1d406c2ad100f6c2))
* package ([f68d3bd](https://github.com/aves-omni/tmdb-addon/commit/f68d3bded6f1b18c1a0fa56f6e4f47db878a3788))
* prevent TypeError in parseImdbLink by avoiding toFixed() ([8bc6239](https://github.com/aves-omni/tmdb-addon/commit/8bc6239d28e5fa0508222314f50cb3949b396217))
* **rating:** handle case when rating cannot fetched from cinemeta ([96d712c](https://github.com/aves-omni/tmdb-addon/commit/96d712cb36f1a96d48504397b6d13849aca18c79))
* remove unnecessary wrapper object from stats endpoint response and simplify error handling ([a30a22a](https://github.com/aves-omni/tmdb-addon/commit/a30a22af1f88bc97e3da93a960b86b7511be5320))
* runtime not displayed on some series ([f92426a](https://github.com/aves-omni/tmdb-addon/commit/f92426a686b57f39bae2feac809c9d6034d8a53c))
* **server:** incorrect imdb rating on links ([e76c968](https://github.com/aves-omni/tmdb-addon/commit/e76c9682470d3ed75fbb42ff6515adb1f3c1949c))
* update Docker deployment workflow to fetch full history and specify main branch reference ([fa7f35f](https://github.com/aves-omni/tmdb-addon/commit/fa7f35f9d068384da352984c2c475ef47ba0b961))
* update image URLs in manifest ([b422028](https://github.com/aves-omni/tmdb-addon/commit/b422028ec37d1594f606e4f903b47cc54fa549c3))
* update language parameter in fetchMDBListItems to use dynamic value ([26bc715](https://github.com/aves-omni/tmdb-addon/commit/26bc715123eec9f4007916f3ce21390221ac7824))
* use baseCatalogs for default catalogs initialization ([07af8d1](https://github.com/aves-omni/tmdb-addon/commit/07af8d10ebc426e43be24b9b038e5465ad053d28))
* use runtime from next episode if show is upcoming ([b93caf6](https://github.com/aves-omni/tmdb-addon/commit/b93caf65f29e9f41a1cf9f40f84afb91ee01f20c))


### Features

* **#81:** add sorting options for watchlist and favorites [#81](https://github.com/aves-omni/tmdb-addon/issues/81) ([f1febdb](https://github.com/aves-omni/tmdb-addon/commit/f1febdb0bccd5961f7972fffc99b0b15289170e2))
* add age rating filter system ([c529cbc](https://github.com/aves-omni/tmdb-addon/commit/c529cbca7d2680f22fb27c81efeca58fafd96082))
* add custom list URL handling and improve API key validation ([7fe82c2](https://github.com/aves-omni/tmdb-addon/commit/7fe82c28b4c6d1e51caacea2f58a0502da70b36c))
* add dev:server script for easier development ([70f31cd](https://github.com/aves-omni/tmdb-addon/commit/70f31cddee229116b4a42b4ffad48c7a56585b53))
* add integration with MDBList for item and genre retrieval ([1599421](https://github.com/aves-omni/tmdb-addon/commit/15994210f1bc05dfdbf17e9c51aacfc314e132d2))
* add name property to catalogs in AddonConfig interface ([50815c1](https://github.com/aves-omni/tmdb-addon/commit/50815c13c0610196b3a8572022410de4827dc75e))
* add option to hide episode thumbnails to prevent spoilers ([e9185e5](https://github.com/aves-omni/tmdb-addon/commit/e9185e512602e85a372d35724fb905d27cb6c613)), closes [#89](https://github.com/aves-omni/tmdb-addon/issues/89)
* add search toggle functionality ([39927a6](https://github.com/aves-omni/tmdb-addon/commit/39927a607210565e6072e7ee4812cb2a7bb6ee13))
* add Stremio addons configuration and enhance catalog description ([fb38580](https://github.com/aves-omni/tmdb-addon/commit/fb38580fb777b16d5e078ef58310c557d85015bf))
* add touch support for catalog drag and drop ([17a8533](https://github.com/aves-omni/tmdb-addon/commit/17a8533c387c141df4589b76da44055e140328c4))
* add URL configuration loader ([1e895dc](https://github.com/aves-omni/tmdb-addon/commit/1e895dc8b9ca494ffa482a1ae76932cc8726bf99))
* add vercel configuration and update vite public directory path ([4256e16](https://github.com/aves-omni/tmdb-addon/commit/4256e1678beccc7f5cc2741f092ba1bd43abe812))
* **analytics:** integrate Mixpanel and display unique users in settings ([caf860a](https://github.com/aves-omni/tmdb-addon/commit/caf860aa8559bee6e36ad3c769fd35c17a00c7a1))
* **analytics:** replace Mixpanel with Swagger Stats and add rate limiting ([b00dafd](https://github.com/aves-omni/tmdb-addon/commit/b00dafdc183d48487ef74a572f82c14809034b4b))
* **analytics:** simplify code and prevent unnecessary tracking calls ([e7d38e9](https://github.com/aves-omni/tmdb-addon/commit/e7d38e95485afb7d9ed95feda67ac94e695dbe94))
* cast images ([4e1be2c](https://github.com/aves-omni/tmdb-addon/commit/4e1be2cf3a3d0e92984bf2c97860ed18b011f9b5))
* **ci:** GitHub Actions workflow for Docker image deployment ([6d7eb1c](https://github.com/aves-omni/tmdb-addon/commit/6d7eb1c0e3e769f170f8c5f04b5fa7e4ef909266))
* enhance cast parsing with dynamic limit and code cleanup ([69fb176](https://github.com/aves-omni/tmdb-addon/commit/69fb1769981b493a7c3ce677b9a70121cba0dcce))
* enhance catalog fetching with metadata retrieval ([48f5afb](https://github.com/aves-omni/tmdb-addon/commit/48f5afb38b66aab102cd8326430e48c5710ac2e5))
* implementer integration with MDBList for API key validation and catalog categorization ([f20df66](https://github.com/aves-omni/tmdb-addon/commit/f20df66b4737c490db4d4cec4efad4d289d296ae))
* integrate Gemini AI search functionality and add API key support ([1962ca8](https://github.com/aves-omni/tmdb-addon/commit/1962ca882b0f490e6f7d603efe8585b378f00e6d))
* integrate Redis for caching and analytics tracking ([31f7dde](https://github.com/aves-omni/tmdb-addon/commit/31f7ddec623c7dd34478670cf189f50326d91626))
* limit cast parsing to top 5 entries ([88b94e0](https://github.com/aves-omni/tmdb-addon/commit/88b94e0041a2ccf68b797fb177b0405276956475))
* **logo:** fetch logos from TMDB and Fanart in parallel and normalize responses ([551cf84](https://github.com/aves-omni/tmdb-addon/commit/551cf841dbe2b9ebf74125e1e5f69e5ad9fbbe3a)), closes [#101](https://github.com/aves-omni/tmdb-addon/issues/101)
* **manifest:** improve description and show active settings ([4dbe51b](https://github.com/aves-omni/tmdb-addon/commit/4dbe51ba90266c2641d40af470f814a6cf19d0e4))
* **meta:** implement caching for IMDb ratings and improve error handling for logo and episode fetching ([25fb763](https://github.com/aves-omni/tmdb-addon/commit/25fb763ce70e96a0496954305ce92edd25910799))
* optimize title search with simultaneous execution of promises ([61464df](https://github.com/aves-omni/tmdb-addon/commit/61464df32a85d66f81975e8906007abb17ea4a24))
* refactor parseMDBListItems to include metadata retrieval and error handling ([b7b67b0](https://github.com/aves-omni/tmdb-addon/commit/b7b67b018b1b90956da7e5b4f77ee607b50bd3b7)), closes [#108](https://github.com/aves-omni/tmdb-addon/issues/108)
* remove Redis dependency and refactor caching implementation to use MongoDB ([d3abf64](https://github.com/aves-omni/tmdb-addon/commit/d3abf6400cae73b12709d6c035b5ed88108c2e6d))
* **security:** add authentication to Swagger Stats UI ([70d2669](https://github.com/aves-omni/tmdb-addon/commit/70d2669e68f78ad640131dd7ffbbed73b361ea23))
* support for IA Search available ([0aea11a](https://github.com/aves-omni/tmdb-addon/commit/0aea11a0882c31d8e71e64de8840ab9dc9b2629c))
* support for MDBLists available ([0015e60](https://github.com/aves-omni/tmdb-addon/commit/0015e60d8a0a2ee313211167d0574e01a8229efb))
* update addon name in getManifest to include 'Addon' ([6ad9ba3](https://github.com/aves-omni/tmdb-addon/commit/6ad9ba369f61e77a7187c6b5a9af7bd3fe09c182))
* update docker-compose configuration to include Redis service and health checks ([0307b8e](https://github.com/aves-omni/tmdb-addon/commit/0307b8e6487aecc0773e567684b2f578da661045))
* update getTrending to include config parameter for metadata retrieval ([0c55c03](https://github.com/aves-omni/tmdb-addon/commit/0c55c037e141fec58eaafb59f7102e8eb0fef955))


### Reverts

* feat: add search toggle functionality ([185ea06](https://github.com/aves-omni/tmdb-addon/commit/185ea069162a2347211e4761c1081c416d6d666f))


### BREAKING CHANGES

* **analytics:** Removed Mixpanel dependency. Metrics are now collected via
Swagger Stats and stored in MongoDB. New available routes:
- /stats - general statistics
- /stats/ui - Swagger Stats web interface
- /stats/metrics - detailed metrics
