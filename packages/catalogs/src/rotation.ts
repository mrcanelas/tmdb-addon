export type RotationMode = 'hourly' | 'daily' | 'weekly';

function rotationBucket(mode: RotationMode, now: Date): number {
  const utcDay = Math.floor(now.getTime() / 86_400_000);
  if (mode === 'hourly') {
    return utcDay * 24 + now.getUTCHours();
  }
  if (mode === 'weekly') {
    return Math.floor(utcDay / 7);
  }
  return utcDay;
}

/** Pick a stable rotation source for the current time window. */
export function pickRotationSource(
  sources: string[],
  mode: RotationMode,
  now: Date = new Date(),
): string {
  if (sources.length === 0) {
    throw new Error('rotation requires at least one source');
  }
  const bucket = rotationBucket(mode, now);
  const index = ((bucket % sources.length) + sources.length) % sources.length;
  return sources[index]!;
}
