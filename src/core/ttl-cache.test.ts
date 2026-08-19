import { describe, it, expect } from "vitest";
import { TtlCache } from "./ttl-cache.ts";

const createClock = (start = 0) => {
  let current = start;
  return { clock: () => new Date(current), advance: (ms: number) => (current += ms) };
};

describe("TtlCache", () => {
  it("should return a value until its ttl passes", () => {
    const clock = createClock();
    const cache = new TtlCache<string, number>({ ttlMs: 100, clock: clock.clock });

    cache.set("a", 1);
    expect(cache.get("a")).toBe(1);

    clock.advance(99);
    expect(cache.get("a")).toBe(1);

    clock.advance(1);
    expect(cache.get("a")).toBeUndefined();
    expect(cache.size).toBe(0);
  });

  it("should store nothing when the ttl is zero", () => {
    const cache = new TtlCache<string, number>({ ttlMs: 0 });

    cache.set("a", 1);

    expect(cache.get("a")).toBeUndefined();
    expect(cache.size).toBe(0);
  });

  it("should refresh the ttl and the position on set", () => {
    const clock = createClock();
    const cache = new TtlCache<string, number>({ ttlMs: 100, clock: clock.clock });

    cache.set("a", 1);
    clock.advance(60);
    cache.set("a", 2);
    clock.advance(60);

    expect(cache.get("a")).toBe(2);
  });

  it("should evict expired entries first, then the oldest, when full", () => {
    const clock = createClock();
    const cache = new TtlCache<string, number>({ ttlMs: 100, maxEntries: 2, clock: clock.clock });

    cache.set("a", 1);
    clock.advance(50);
    cache.set("b", 2);
    clock.advance(60);
    cache.set("c", 3);

    expect(cache.get("a")).toBeUndefined();
    expect(cache.get("b")).toBe(2);
    expect(cache.get("c")).toBe(3);

    cache.set("d", 4);

    expect(cache.get("b")).toBeUndefined();
    expect(cache.get("c")).toBe(3);
    expect(cache.get("d")).toBe(4);
    expect(cache.size).toBe(2);
  });

  it("should keep at least one entry when maxEntries is below one", () => {
    const cache = new TtlCache<string, number>({ ttlMs: 100, maxEntries: 0 });

    cache.set("a", 1);
    cache.set("b", 2);

    expect(cache.get("a")).toBeUndefined();
    expect(cache.get("b")).toBe(2);
    expect(cache.size).toBe(1);
  });

  it("should delete and clear", () => {
    const cache = new TtlCache<string, number>({ ttlMs: 100 });

    cache.set("a", 1);
    cache.set("b", 2);

    expect(cache.delete("a")).toBe(true);
    expect(cache.get("a")).toBeUndefined();

    cache.clear();
    expect(cache.size).toBe(0);
  });
});
