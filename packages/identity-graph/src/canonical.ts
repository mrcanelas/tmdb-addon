import { randomBytes } from 'node:crypto';
import type { CanonicalIdentity, IdentityEntityKind } from './types.js';

const CROCKFORD = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';

/**
 * Compact ULID-like id (26 Crockford chars). Not a strict ULID library —
 * sufficient for opaque canonical suffixes in alpha.
 */
export function generateOpaqueId(now = new Date()): string {
  const time = now.getTime();
  let timePart = '';
  let t = time;
  for (let i = 0; i < 10; i++) {
    timePart = CROCKFORD[t % 16] + timePart;
    t = Math.floor(t / 16);
  }
  const bytes = randomBytes(10);
  let randPart = '';
  for (let i = 0; i < 16; i++) {
    randPart += CROCKFORD[bytes[i % 10]! % 32];
  }
  return (timePart + randPart).slice(0, 26);
}

export function createCanonicalId(
  entityKind: IdentityEntityKind,
  suffix?: string,
  now = new Date(),
): CanonicalIdentity {
  const id = `metalayer:${entityKind}:${suffix ?? generateOpaqueId(now)}`;
  return {
    id,
    entityKind,
    createdAt: now.toISOString(),
  };
}

export function parseCanonicalId(value: string): {
  entityKind: IdentityEntityKind;
  suffix: string;
} | null {
  const match = /^metalayer:([a-z]+):([A-Z0-9]+)$/i.exec(value.trim());
  if (!match) return null;
  return {
    entityKind: match[1] as IdentityEntityKind,
    suffix: match[2]!,
  };
}

/** Stable deterministic suffix from sorted provider ids (for tests / cache keys). */
export function deterministicCanonicalSuffix(
  ids: Record<string, string | number | undefined | null>,
): string {
  const parts = Object.entries(ids)
    .filter(([, value]) => value !== undefined && value !== null && value !== '')
    .map(([key, value]) => `${key}:${String(value).toLowerCase()}`)
    .sort();
  let hash = 0;
  const joined = parts.join('|');
  for (let i = 0; i < joined.length; i++) {
    hash = (hash * 31 + joined.charCodeAt(i)) >>> 0;
  }
  return hash.toString(16).toUpperCase().padStart(8, '0').slice(0, 26);
}
