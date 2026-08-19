import type { Clock, Optional } from "../types/common.ts";
import { systemClock } from "./clock.ts";

type TtlCacheOptions = { ttlMs: number; maxEntries?: number; clock?: Clock };

type Entry<V> = { value: V; expiresAt: number };

const CACHE_LIMITS = { defaultMaxEntries: 10_000, minMaxEntries: 1 } as const;

export class TtlCache<K, V> {
  private readonly entries = new Map<K, Entry<V>>();
  private readonly ttlMs: number;
  private readonly maxEntries: number;
  private readonly clock: Clock;

  constructor({ ttlMs, maxEntries = CACHE_LIMITS.defaultMaxEntries, clock = systemClock }: TtlCacheOptions) {
    this.ttlMs = ttlMs;
    this.maxEntries = Math.max(CACHE_LIMITS.minMaxEntries, maxEntries);
    this.clock = clock;
  }

  get size(): number {
    return this.entries.size;
  }

  get(key: K): Optional<V> {
    const entry = this.entries.get(key);
    if (!entry) {
      return undefined;
    }
    if (entry.expiresAt <= this.now()) {
      this.entries.delete(key);
      return undefined;
    }
    return entry.value;
  }

  set(key: K, value: V): void {
    if (this.ttlMs <= 0) {
      return;
    }
    this.entries.delete(key);
    if (this.entries.size >= this.maxEntries) {
      this.evictOldest();
    }
    this.entries.set(key, { value, expiresAt: this.now() + this.ttlMs });
  }

  delete(key: K): boolean {
    return this.entries.delete(key);
  }

  clear(): void {
    this.entries.clear();
  }

  private now(): number {
    return this.clock().getTime();
  }

  private evictOldest(): void {
    const oldest = this.entries.keys().next();
    if (!oldest.done) {
      this.entries.delete(oldest.value);
    }
  }
}
