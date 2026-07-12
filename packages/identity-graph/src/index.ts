export type {
  IdentityEntityKind,
  IdentityProvider,
  IdentityMatchMethod,
  ExternalIdentity,
  IdentityEvidence,
  IdentityEdge,
  CanonicalIdentity,
} from './types.js';

export { MAPPING_PRECEDENCE, precedenceScore } from './types.js';

export {
  generateOpaqueId,
  createCanonicalId,
  parseCanonicalId,
  deterministicCanonicalSuffix,
} from './canonical.js';

export {
  buildEdgesFromProviderIds,
  buildExactMatchEdge,
  type ProviderIdBag,
} from './edges.js';

export {
  resolveIdentityMapping,
  findProviderId,
  type ResolveIdentityInput,
  type ResolvedIdentityMapping,
  type IdentityCorrectionStub,
} from './resolve.js';

export { IdentityMappingCache, buildIdentityCacheKey } from './cache.js';

export {
  buildIdentityDiagnostics,
  type IdentityDiagnostics,
} from './diagnostics.js';
