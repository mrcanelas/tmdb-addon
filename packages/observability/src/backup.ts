import { timingSafeEqual } from 'node:crypto';

/** Constant-time string compare for operator tokens. */
export function safeTokenEquals(provided: string, expected: string): boolean {
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length) {
    // Still compare to avoid trivial timing on length-only path for equal-length padded check.
    const pad = Buffer.alloc(Math.max(a.length, b.length));
    timingSafeEqual(pad, pad);
    return false;
  }
  return timingSafeEqual(a, b);
}

export interface BackupManifest {
  format: 'metalayer-backup';
  formatVersion: 1;
  createdAt: string;
  mode: string;
  version: string;
  includesSecrets: false;
  configurations: unknown[];
  notes: string[];
}

export function buildSafeBackup(input: {
  version: string;
  mode: string;
  configurations: unknown[];
}): BackupManifest {
  return {
    format: 'metalayer-backup',
    formatVersion: 1,
    createdAt: new Date().toISOString(),
    mode: input.mode,
    version: input.version,
    includesSecrets: false,
    configurations: input.configurations,
    notes: [
      'Secrets are excluded from default backups.',
      'Store METALAYER_ENCRYPTION_KEY separately — never inside backup JSON.',
    ],
  };
}
