export interface Identifiable {
  id: string;
}

/**
 * Deterministic 32-bit FNV-1a hash for a seed, cycle, and item id.
 */
export function hashSeedItem(
  seed: string,
  cycle: number,
  itemId: string,
): number {
  const str = `${seed}:${cycle}:${itemId}`;
  let hash = 2166136261;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

/**
 * Permutes items deterministically based on seed and cycle without repetition.
 * Optionally pins startingId to index 0.
 */
export function epochShuffle<T extends Identifiable>(
  items: T[],
  seed: string,
  cycle: number,
  startingId?: string,
): T[] {
  if (items.length <= 1) {
    return [...items];
  }

  const scored = items.map((item) => ({
    item,
    score: hashSeedItem(seed, cycle, item.id),
  }));

  scored.sort((a, b) => a.score - b.score);
  const result = scored.map((s) => s.item);

  if (startingId) {
    const startIndex = result.findIndex((item) => item.id === startingId);
    if (startIndex > 0) {
      const [matched] = result.splice(startIndex, 1);
      if (matched) {
        result.unshift(matched);
      }
    }
  }

  return result;
}
