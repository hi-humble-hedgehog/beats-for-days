import type { AudioBufferLike, BufferLoader } from "./types";

export interface BoundedAudioCacheOptions {
  capacity?: number;
  loader: BufferLoader;
}

/**
 * Caches decoded AudioBuffers using a bounded least-recently-used (LRU) policy.
 * Prevents memory leaks during continuous streaming sessions by evicting stale audio data.
 */
export class BoundedAudioCache {
  private readonly capacity: number;
  private readonly loader: BufferLoader;
  private readonly entries = new Map<string, AudioBufferLike>();

  /**
   * Creates a bounded audio cache with an LRU eviction limit and buffer loader.
   */
  constructor(options: BoundedAudioCacheOptions) {
    this.capacity = options.capacity ?? 10;
    this.loader = options.loader;
  }

  /**
   * Number of decoded AudioBuffers currently held in memory.
   */
  get size(): number {
    return this.entries.size;
  }

  /**
   * Checks whether an audio URL is present in the cache.
   */
  has(url: string): boolean {
    return this.entries.has(url);
  }

  /**
   * Retrieves an AudioBuffer from cache or fetches and decodes it via the injected loader.
   */
  async get(url: string): Promise<AudioBufferLike> {
    const existing = this.entries.get(url);
    if (existing) {
      // Re-insert to mark as most recently used
      this.entries.delete(url);
      this.entries.set(url, existing);
      return existing;
    }

    const loaded = await this.loader(url);
    this.entries.set(url, loaded);

    if (this.entries.size > this.capacity) {
      const oldestKey = this.entries.keys().next().value;
      if (oldestKey !== undefined) {
        this.entries.delete(oldestKey);
      }
    }

    return loaded;
  }

  /**
   * Clears all cached AudioBuffers.
   */
  clear(): void {
    this.entries.clear();
  }
}
