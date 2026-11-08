/**
 * UUID-like hex id that works outside secure contexts.
 * `crypto.randomUUID` is missing on http://LAN-IP (non-localhost), where
 * Configure is often opened during local network testing.
 */
export function randomId(bytes = 16): string {
  const buffer = new Uint8Array(bytes);
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    crypto.getRandomValues(buffer);
  } else {
    for (let i = 0; i < buffer.length; i += 1) {
      buffer[i] = Math.floor(Math.random() * 256);
    }
  }
  return Array.from(buffer, (byte) => byte.toString(16).padStart(2, '0')).join(
    '',
  );
}
