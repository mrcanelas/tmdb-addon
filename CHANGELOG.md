## [1.0.2](https://github.com/aves-omni/tmdb-addon/compare/v1.0.1...v1.0.2) (2025-07-06)


### Bug Fixes

* update addon name and description for Omni fork ([38e4209](https://github.com/aves-omni/tmdb-addon/commit/38e420970d42e082f885b59e5d758b9fed80c500))

## [1.0.1](https://github.com/aves-omni/tmdb-addon/compare/v1.0.0...v1.0.1) (2025-07-06)


### Bug Fixes

* update package version to 3.1.7 ([b9d5d1e](https://github.com/aves-omni/tmdb-addon/commit/b9d5d1e0058c8a9b9be6bdda8f9ba8d252a9355c))

# 1.0.0 (2025-07-06)


### Bug Fixes

* **#73:** catalog enable/disable state and cleanup ([2188577](https://github.com/aves-omni/tmdb-addon/commit/2188577c33c4d9cdd4ba8078ac254c949c4d662e)), closes [#73](https://github.com/aves-omni/tmdb-addon/issues/73) [#73](https://github.com/aves-omni/tmdb-addon/issues/73)
* **#74, #80:** decouple search functionality from popular catalog ([8c2c47a](https://github.com/aves-omni/tmdb-addon/commit/8c2c47a1847810db97b6343f664aba52ce717ce6)), closes [#74](https://github.com/aves-omni/tmdb-addon/issues/74) [#80](https://github.com/aves-omni/tmdb-addon/issues/80) [#74](https://github.com/aves-omni/tmdb-addon/issues/74) [#80](https://github.com/aves-omni/tmdb-addon/issues/80)
* **#78:** improve search functionality for non-latin queries ([a827813](https://github.com/aves-omni/tmdb-addon/commit/a82781319f4b7acecb78a5026e976d239b789dc9)), closes [#78](https://github.com/aves-omni/tmdb-addon/issues/78) [#78](https://github.com/aves-omni/tmdb-addon/issues/78)
* **#79:** correct addon installation protocol ([da62e65](https://github.com/aves-omni/tmdb-addon/commit/da62e65d192d1228ef3ce540a3ccfb345131d880)), closes [#79](https://github.com/aves-omni/tmdb-addon/issues/79) [#79](https://github.com/aves-omni/tmdb-addon/issues/79)
* add extra plugins for semantic release in Docker deployment workflow ([6f4cf9e](https://github.com/aves-omni/tmdb-addon/commit/6f4cf9eacfddac8bd779e0703877507043635834))
* add fallback for untranslated catalog options ([e1bd6cd](https://github.com/aves-omni/tmdb-addon/commit/e1bd6cd2f6e9ae3a13b1c1332d74528177fcdd7f))
* add mdblistkey handling in loadConfigFromUrl ([798e315](https://github.com/aves-omni/tmdb-addon/commit/798e315a5c1fd2c7bab5808bc954f4476dd70f6f))
* add null safety checks for cache in checkSeasons utility ([95549a0](https://github.com/aves-omni/tmdb-addon/commit/95549a00679630ef5851d9704846d08db9a984fa))
* add optional chaining to imdbRating ([21b19df](https://github.com/aves-omni/tmdb-addon/commit/21b19df325cb74f346fd85b2e0c929abc8e79fa2))
* add version verification steps in Docker deployment workflow ([0ed827d](https://github.com/aves-omni/tmdb-addon/commit/0ed827de75248f71016149de7568d945dd5f1f2c))
* adjust genre requirement based on showInHome flag in createMDBListCatalog ([7d13915](https://github.com/aves-omni/tmdb-addon/commit/7d139157eb50a3c1af4569880c5f9454e324a250))
* catalog genre requirement based on home visibility ([ce74258](https://github.com/aves-omni/tmdb-addon/commit/ce742589de5e27d43a99a9a563692b1400dcca2c))
* check runtime on episode_run_time array first ([e7fc429](https://github.com/aves-omni/tmdb-addon/commit/e7fc4291bb5d588ad1fc8572c6fa74eaa1ac0f5f))
* **checkSeasons:** remove unnecessary state=open parameter from issue query ([6e09f0c](https://github.com/aves-omni/tmdb-addon/commit/6e09f0c6d93b84113b3b097210a7cba694aaebc3))
* comment out build context in docker-compose.yml for tmdb-addon service ([91e5881](https://github.com/aves-omni/tmdb-addon/commit/91e58811dece8f20d748af95cdf6506481664b8b))
* configure Git settings in Docker deployment workflow ([6fe7efe](https://github.com/aves-omni/tmdb-addon/commit/6fe7efe6b4d45ba7e8f3dddc6a34f2108456bd5d))
* **diferentOrder:** corrigir episodeGroupId para "Naruto" ([4b3a4c5](https://github.com/aves-omni/tmdb-addon/commit/4b3a4c587605a3ddb938d17bbc24309e39abb2f5)), closes [#1005](https://github.com/aves-omni/tmdb-addon/issues/1005)
* **diferentOrder:** fix episodeGroupId for "Bakemonogatari" ([1cce5ad](https://github.com/aves-omni/tmdb-addon/commit/1cce5add8c9640b121e9c7f8a6a6b63dee20aeab)), closes [#1024](https://github.com/aves-omni/tmdb-addon/issues/1024)
* ensure default catalogs are loaded on direct installation ([e72fa88](https://github.com/aves-omni/tmdb-addon/commit/e72fa883d569a29a010b7cc163a318af5869e1f0))
* fetch runtime from last aired episode ([019215b](https://github.com/aves-omni/tmdb-addon/commit/019215bde44e14f15c4376ba1d406c2ad100f6c2))
* fix query variable usage in getSearch ([cf53e83](https://github.com/aves-omni/tmdb-addon/commit/cf53e8383c002526c658039766a432ee8e375350)), closes [#117](https://github.com/aves-omni/tmdb-addon/issues/117)
* **getLogo:** correct variable naming for FanartTvApi initialization ([de8de39](https://github.com/aves-omni/tmdb-addon/commit/de8de39be4a034c4e49dac9b5937296658720056))
* package ([f68d3bd](https://github.com/aves-omni/tmdb-addon/commit/f68d3bded6f1b18c1a0fa56f6e4f47db878a3788))
* **package:** update dependencies for cache manager and fanart.tv-api ([4bc5d14](https://github.com/aves-omni/tmdb-addon/commit/4bc5d141a171db83471eeb3f516e3fcd6cecf782))
* **parseCast:** remove debug log for count parameter ([b33d716](https://github.com/aves-omni/tmdb-addon/commit/b33d71610a911318bf5f3ac88aaa4154a4772410))
* prevent null reference error in parseConfig function ([1700497](https://github.com/aves-omni/tmdb-addon/commit/1700497f484c25e6e43d92752c9a80d76185c5f5)), closes [#987](https://github.com/aves-omni/tmdb-addon/issues/987)
* prevent TypeError in parseImdbLink by avoiding toFixed() ([8bc6239](https://github.com/aves-omni/tmdb-addon/commit/8bc6239d28e5fa0508222314f50cb3949b396217))
* **rating:** handle case when rating cannot fetched from cinemeta ([96d712c](https://github.com/aves-omni/tmdb-addon/commit/96d712cb36f1a96d48504397b6d13849aca18c79))
* remove unnecessary wrapper object from stats endpoint response and simplify error handling ([a30a22a](https://github.com/aves-omni/tmdb-addon/commit/a30a22af1f88bc97e3da93a960b86b7511be5320))
* runtime not displayed on some series ([f92426a](https://github.com/aves-omni/tmdb-addon/commit/f92426a686b57f39bae2feac809c9d6034d8a53c))
* **server:** incorrect imdb rating on links ([e76c968](https://github.com/aves-omni/tmdb-addon/commit/e76c9682470d3ed75fbb42ff6515adb1f3c1949c))
* update .releaserc.json and Docker deployment workflow ([82722e2](https://github.com/aves-omni/tmdb-addon/commit/82722e2ad4622460db8aa372c4af806360166dfa))
* update .releaserc.json to disable npm publishing in semantic-release configuration ([6d49752](https://github.com/aves-omni/tmdb-addon/commit/6d4975243eb61739cf84965182e90a336ed3c390))
* update Docker deployment workflow to disable caching during build ([979a5ff](https://github.com/aves-omni/tmdb-addon/commit/979a5ff09f8c5c732ec3933988366fbe2d617082))
* update Docker deployment workflow to fetch full history and specify main branch reference ([fa7f35f](https://github.com/aves-omni/tmdb-addon/commit/fa7f35f9d068384da352984c2c475ef47ba0b961))
* update Docker deployment workflow to include additional semantic-release plugins ([b56cfaa](https://github.com/aves-omni/tmdb-addon/commit/b56cfaafad96a81b4bfb490bfafb4c582b32e420))
* update Docker deployment workflow to include artifact upload and download steps ([6bcf1ed](https://github.com/aves-omni/tmdb-addon/commit/6bcf1ed5073218b88ef201e86c4a274f2a9f968a))
* update Docker image tag in docker-compose.yml to latest and adjust checkout step in docker-deploy.yml ([71e3259](https://github.com/aves-omni/tmdb-addon/commit/71e3259dd4694dd2839dcd8528e6e79ea4347b6b))
* update Docker image tag in docker-compose.yml to v1.0.0 ([75b0497](https://github.com/aves-omni/tmdb-addon/commit/75b049731ef70b29c008c49591b5eaee5c617abd))
* update Dockerfile and docker-compose.yml for improved build process ([acaebe6](https://github.com/aves-omni/tmdb-addon/commit/acaebe61c83f51c5be1cb9801c97bb8c453c1957))
* update image URLs in manifest ([b422028](https://github.com/aves-omni/tmdb-addon/commit/b422028ec37d1594f606e4f903b47cc54fa549c3))
* update language parameter in fetchMDBListItems to use dynamic value ([26bc715](https://github.com/aves-omni/tmdb-addon/commit/26bc715123eec9f4007916f3ce21390221ac7824))
* update semantic-release configuration in .releaserc.json and Docker deployment workflow ([ccdabc5](https://github.com/aves-omni/tmdb-addon/commit/ccdabc5663429c99f143b71559c5007be915cbdf))
* use baseCatalogs for default catalogs initialization ([07af8d1](https://github.com/aves-omni/tmdb-addon/commit/07af8d10ebc426e43be24b9b038e5465ad053d28))
* use runtime from next episode if show is upcoming ([b93caf6](https://github.com/aves-omni/tmdb-addon/commit/b93caf65f29e9f41a1cf9f40f84afb91ee01f20c))


### Features

* **#81:** add sorting options for watchlist and favorites [#81](https://github.com/aves-omni/tmdb-addon/issues/81) ([f1febdb](https://github.com/aves-omni/tmdb-addon/commit/f1febdb0bccd5961f7972fffc99b0b15289170e2))
* add "WIND BREAKER" to diferentOrder.json ([90e38cd](https://github.com/aves-omni/tmdb-addon/commit/90e38cd4929123828735fcafeb5d959fd94e9503)), closes [#116](https://github.com/aves-omni/tmdb-addon/issues/116)
* add age rating filter system ([c529cbc](https://github.com/aves-omni/tmdb-addon/commit/c529cbca7d2680f22fb27c81efeca58fafd96082))
* add automatic season count check and GitHub issue creation for TMDB vs Stremio discrepancies ([b8727eb](https://github.com/aves-omni/tmdb-addon/commit/b8727ebb9b2e574b1226d79485fae9670e3d3538))
* add custom list URL handling and improve API key validation ([7fe82c2](https://github.com/aves-omni/tmdb-addon/commit/7fe82c28b4c6d1e51caacea2f58a0502da70b36c))
* add dev:server script for easier development ([70f31cd](https://github.com/aves-omni/tmdb-addon/commit/70f31cddee229116b4a42b4ffad48c7a56585b53))
* add integration with MDBList for item and genre retrieval ([1599421](https://github.com/aves-omni/tmdb-addon/commit/15994210f1bc05dfdbf17e9c51aacfc314e132d2))
* add lz-string dependency ([a4d9b9a](https://github.com/aves-omni/tmdb-addon/commit/a4d9b9aff76be312718af23f1eee81a36d34b183))
* add name property to catalogs in AddonConfig interface ([50815c1](https://github.com/aves-omni/tmdb-addon/commit/50815c13c0610196b3a8572022410de4827dc75e))
* add option to hide episode thumbnails to prevent spoilers ([e9185e5](https://github.com/aves-omni/tmdb-addon/commit/e9185e512602e85a372d35724fb905d27cb6c613)), closes [#89](https://github.com/aves-omni/tmdb-addon/issues/89)
* add search toggle functionality ([39927a6](https://github.com/aves-omni/tmdb-addon/commit/39927a607210565e6072e7ee4812cb2a7bb6ee13))
* add Stremio addons configuration and enhance catalog description ([fb38580](https://github.com/aves-omni/tmdb-addon/commit/fb38580fb777b16d5e078ef58310c557d85015bf))
* add support for new configuration keys in loadConfigFromUrl ([44d3b05](https://github.com/aves-omni/tmdb-addon/commit/44d3b05404eaba508b92e54add1d668aa5402a93))
* add touch support for catalog drag and drop ([17a8533](https://github.com/aves-omni/tmdb-addon/commit/17a8533c387c141df4589b76da44055e140328c4))
* add URL configuration loader ([1e895dc](https://github.com/aves-omni/tmdb-addon/commit/1e895dc8b9ca494ffa482a1ae76932cc8726bf99))
* add vercel configuration and update vite public directory path ([4256e16](https://github.com/aves-omni/tmdb-addon/commit/4256e1678beccc7f5cc2741f092ba1bd43abe812))
* add versioning support to Dockerfile and Vite configuration ([6f9eee1](https://github.com/aves-omni/tmdb-addon/commit/6f9eee1c775c333de9b1ef8d6cb5569733e70090))
* **analytics:** integrate Mixpanel and display unique users in settings ([caf860a](https://github.com/aves-omni/tmdb-addon/commit/caf860aa8559bee6e36ad3c769fd35c17a00c7a1))
* **analytics:** replace Mixpanel with Swagger Stats and add rate limiting ([b00dafd](https://github.com/aves-omni/tmdb-addon/commit/b00dafdc183d48487ef74a572f82c14809034b4b))
* **analytics:** simplify code and prevent unnecessary tracking calls ([e7d38e9](https://github.com/aves-omni/tmdb-addon/commit/e7d38e95485afb7d9ed95feda67ac94e695dbe94))
* cast images ([4e1be2c](https://github.com/aves-omni/tmdb-addon/commit/4e1be2cf3a3d0e92984bf2c97860ed18b011f9b5))
* **ci:** GitHub Actions workflow for Docker image deployment ([6d7eb1c](https://github.com/aves-omni/tmdb-addon/commit/6d7eb1c0e3e769f170f8c5f04b5fa7e4ef909266))
* **config:** add 'hideInCinemaTag' and improve cast count logic ([31b2097](https://github.com/aves-omni/tmdb-addon/commit/31b20971e8e1ff19bb5a7348214613de8877edea)), closes [#111](https://github.com/aves-omni/tmdb-addon/issues/111)
* **diferentImdbId:** add new entry for "Dragon Ball" ([a9dc039](https://github.com/aves-omni/tmdb-addon/commit/a9dc039425312130cded954b6966a3586ea090eb)), closes [#1045](https://github.com/aves-omni/tmdb-addon/issues/1045)
* **diferentImdbId:** add new entry for "Dragon Ball" ([1d29fdc](https://github.com/aves-omni/tmdb-addon/commit/1d29fdc4b8e0b49572b0903f8edb41c0b2495a38))
* **diferentOrder:** add new entry for "American Dad!" ([963ee72](https://github.com/aves-omni/tmdb-addon/commit/963ee72b77a6c0e393a68a1b82a830ab26ab264c)), closes [#981](https://github.com/aves-omni/tmdb-addon/issues/981)
* **diferentOrder:** add new entry for "Bleach" ([3fa8c74](https://github.com/aves-omni/tmdb-addon/commit/3fa8c74da55c51b9ba55f84d620c8b0be0b3b05a)), closes [#1002](https://github.com/aves-omni/tmdb-addon/issues/1002)
* **diferentOrder:** add new entry for "Bungo Stray Dogs" ([7eaa938](https://github.com/aves-omni/tmdb-addon/commit/7eaa938d11c41544428e9714f7992c657e00ac20)), closes [#1011](https://github.com/aves-omni/tmdb-addon/issues/1011)
* **diferentOrder:** add new entry for "Caméra café" ([0ac69f3](https://github.com/aves-omni/tmdb-addon/commit/0ac69f33f53024ee56370973e4c1024350c625d1)), closes [#971](https://github.com/aves-omni/tmdb-addon/issues/971)
* **diferentOrder:** add new entry for "Cold Case Files" ([1a89c71](https://github.com/aves-omni/tmdb-addon/commit/1a89c71ff2624422d3bc72327bce11436b358c5a)), closes [#1001](https://github.com/aves-omni/tmdb-addon/issues/1001)
* **diferentOrder:** add new entry for "DAN DA DAN" ([b5fc7b3](https://github.com/aves-omni/tmdb-addon/commit/b5fc7b3c4c88d2fb91ec536c594bb425a0bebc41))
* **diferentOrder:** add new entry for "Detective Conan" ([1095e8f](https://github.com/aves-omni/tmdb-addon/commit/1095e8f1d17f9e4539305fbf01673bf4e3f493a4)), closes [#967](https://github.com/aves-omni/tmdb-addon/issues/967)
* **diferentOrder:** add new entry for "Dragon Ball Super" ([1e0f89b](https://github.com/aves-omni/tmdb-addon/commit/1e0f89b03724376e8808e0cdb789efee381b1eea)), closes [#1046](https://github.com/aves-omni/tmdb-addon/issues/1046)
* **diferentOrder:** add new entry for "Dragon Ball Z Kai" ([3591307](https://github.com/aves-omni/tmdb-addon/commit/3591307303e1a3ca9c5bf069f53d2f008293db56)), closes [#1106](https://github.com/aves-omni/tmdb-addon/issues/1106)
* **diferentOrder:** add new entry for "Farscape" ([96f4e29](https://github.com/aves-omni/tmdb-addon/commit/96f4e298b6260bdc1f54f576f40e46fa95441577)), closes [#975](https://github.com/aves-omni/tmdb-addon/issues/975)
* **diferentOrder:** add new entry for "Fate/Extra Last Encore" ([ead8dfe](https://github.com/aves-omni/tmdb-addon/commit/ead8dfe4e1773d9afce04d58ae5a6deb9c8976da)), closes [#1026](https://github.com/aves-omni/tmdb-addon/issues/1026)
* **diferentOrder:** add new entry for "Jujutsu Kaisen" ([2b7be52](https://github.com/aves-omni/tmdb-addon/commit/2b7be521f474ef34aedb9dca8c2b1a1c793d4662)), closes [#1003](https://github.com/aves-omni/tmdb-addon/issues/1003)
* **diferentOrder:** add new entry for "King of the Hill" ([cadeae7](https://github.com/aves-omni/tmdb-addon/commit/cadeae7beafb6514ec68329d99553904ed490ecc)), closes [#958](https://github.com/aves-omni/tmdb-addon/issues/958)
* **diferentOrder:** add new entry for "Mashle: Magic and Muscles" ([65868e8](https://github.com/aves-omni/tmdb-addon/commit/65868e8cd58177fde6c50cf20c2236c28f5f9989)), closes [#1068](https://github.com/aves-omni/tmdb-addon/issues/1068)
* **diferentOrder:** add new entry for "Pac-Man and the Ghostly Adventures" ([2481e19](https://github.com/aves-omni/tmdb-addon/commit/2481e19af6a9fac4565073b5aa64e5d097bc0a5f)), closes [#1110](https://github.com/aves-omni/tmdb-addon/issues/1110)
* **diferentOrder:** add new entry for "Pokémon" ([6e69bba](https://github.com/aves-omni/tmdb-addon/commit/6e69bba3c90ef8c9b77959f624499a4faa816d73)), closes [#965](https://github.com/aves-omni/tmdb-addon/issues/965)
* **diferentOrder:** add new entry for "Ranma ½" ([be9d424](https://github.com/aves-omni/tmdb-addon/commit/be9d424b9efc0d09bf6b10f142f679e2792f9cc8)), closes [#1086](https://github.com/aves-omni/tmdb-addon/issues/1086)
* **diferentOrder:** add new entry for "Running Man" ([47ceb6e](https://github.com/aves-omni/tmdb-addon/commit/47ceb6eb72cce8bca94faf93dbbafb47152537dc)), closes [#1067](https://github.com/aves-omni/tmdb-addon/issues/1067)
* **diferentOrder:** add new entry for "The 100 Girlfriends Who Really, Really, Really, Really, REALLY Love You" ([7d07588](https://github.com/aves-omni/tmdb-addon/commit/7d07588920bb30767e41e4b3dfc66bf8ddfe9dd5)), closes [#1031](https://github.com/aves-omni/tmdb-addon/issues/1031)
* **diferentOrder:** add new entry for "Tomorrow Is Ours" ([0c4fe28](https://github.com/aves-omni/tmdb-addon/commit/0c4fe28899554383370098f0ae3aff5963614327)), closes [#970](https://github.com/aves-omni/tmdb-addon/issues/970)
* **diferentOrder:** add new entry for "Urusei Yatsura" ([2e0a439](https://github.com/aves-omni/tmdb-addon/commit/2e0a43944452bf8c45a8a60f7b5730da226fe396)), closes [#1083](https://github.com/aves-omni/tmdb-addon/issues/1083)
* **diferentOrder:** add new entry for "Yu-Gi-Oh! Arc-V" ([2c956d0](https://github.com/aves-omni/tmdb-addon/commit/2c956d037c06e9ed89ae995186c2f3d70906f820)), closes [#974](https://github.com/aves-omni/tmdb-addon/issues/974)
* **diferentOrder:** add new entry for "Zatch Bell!" ([a446577](https://github.com/aves-omni/tmdb-addon/commit/a44657717f7cb677c0b75ccf9c5aca23f211c239)), closes [#1084](https://github.com/aves-omni/tmdb-addon/issues/1084)
* **diferentOrder:** remove duplicate entry for "Jujutsu Kaisen" ([60fb0e9](https://github.com/aves-omni/tmdb-addon/commit/60fb0e911f66a5de89dd30f5a051ffebf3fca70e))
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

# [3.2.0](https://github.com/aves-omni/tmdb-addon/compare/v3.1.15...v3.2.0) (2025-06-21)


### Features

* add versioning support to Dockerfile and Vite configuration ([6f9eee1](https://github.com/aves-omni/tmdb-addon/commit/6f9eee1c775c333de9b1ef8d6cb5569733e70090))

## [3.1.15](https://github.com/aves-omni/tmdb-addon/compare/v3.1.14...v3.1.15) (2025-06-21)


### Bug Fixes

* update Dockerfile and docker-compose.yml for improved build process ([acaebe6](https://github.com/aves-omni/tmdb-addon/commit/acaebe61c83f51c5be1cb9801c97bb8c453c1957))

## [3.1.14](https://github.com/aves-omni/tmdb-addon/compare/v3.1.13...v3.1.14) (2025-06-21)


### Bug Fixes

* update .releaserc.json and Docker deployment workflow ([82722e2](https://github.com/aves-omni/tmdb-addon/commit/82722e2ad4622460db8aa372c4af806360166dfa))

## [3.1.13](https://github.com/aves-omni/tmdb-addon/compare/v3.1.12...v3.1.13) (2025-06-20)


### Bug Fixes

* add version verification steps in Docker deployment workflow ([0ed827d](https://github.com/aves-omni/tmdb-addon/commit/0ed827de75248f71016149de7568d945dd5f1f2c))

## [3.1.12](https://github.com/aves-omni/tmdb-addon/compare/v3.1.11...v3.1.12) (2025-06-20)


### Bug Fixes

* update .releaserc.json to disable npm publishing in semantic-release configuration ([6d49752](https://github.com/aves-omni/tmdb-addon/commit/6d4975243eb61739cf84965182e90a336ed3c390))
* update semantic-release configuration in .releaserc.json and Docker deployment workflow ([ccdabc5](https://github.com/aves-omni/tmdb-addon/commit/ccdabc5663429c99f143b71559c5007be915cbdf))

## [3.1.11](https://github.com/aves-omni/tmdb-addon/compare/v3.1.10...v3.1.11) (2025-06-20)


### Bug Fixes

* update Docker deployment workflow to include additional semantic-release plugins ([b56cfaa](https://github.com/aves-omni/tmdb-addon/commit/b56cfaafad96a81b4bfb490bfafb4c582b32e420))

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
