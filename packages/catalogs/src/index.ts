export {
  sortCatalogsByPosition,
  reindexCatalogPositions,
  resolveCatalogDisplayName,
  toManifestCatalogEntries,
  renameCatalog,
  duplicateCatalog,
  moveCatalog,
  setCatalogEnabled,
  setCatalogShowInHome,
  createCatalogInstance,
} from './studio.js';

export {
  setCatalogTags,
  setCatalogGroup,
  deleteCatalog,
  createMergedCatalog,
  createRotatedCatalog,
  exportCatalogDefinitions,
  importCatalogDefinitions,
} from './studio-extra.js';

export { mergeMetas, type CatalogMetaPreview } from './merge.js';
export { pickRotationSource, type RotationMode } from './rotation.js';
export {
  resolveCatalogResults,
  type FetchCatalogLeaf,
  type CatalogResolveResult,
  type CatalogPreviewWarning,
  type CatalogPreviewWarningCode,
} from './resolve.js';
