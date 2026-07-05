import { describe, expect, it, vi, afterEach } from "vitest";
import { allowDaily, allowSliding, LruCache, normalizeQuery } from "../ratelimit";

afterEach(() => vi.useRealTimers());

describe("allowSliding", () => {
  it("allows up to max hits then blocks within the window", () => {
    const key = `t-${Math.random()}`;
    expect(allowSliding(key, 3, 1000)).toBe(true);
    expect(allowSliding(key, 3, 1000)).toBe(true);
    expect(allowSliding(key, 3, 1000)).toBe(true);
    expect(allowSliding(key, 3, 1000)).toBe(false);
  });

  it("frees capacity after the window passes", () => {
    vi.useFakeTimers();
    const key = `t-${Math.random()}`;
    expect(allowSliding(key, 1, 1000)).toBe(true);
    expect(allowSliding(key, 1, 1000)).toBe(false);
    vi.advanceTimersByTime(1100);
    expect(allowSliding(key, 1, 1000)).toBe(true);
  });

  it("tracks keys independently", () => {
    const a = `a-${Math.random()}`;
    const b = `b-${Math.random()}`;
    expect(allowSliding(a, 1, 60_000)).toBe(true);
    expect(allowSliding(a, 1, 60_000)).toBe(false);
    expect(allowSliding(b, 1, 60_000)).toBe(true);
  });
});

describe("allowDaily", () => {
  it("caps per UTC day and resets on a new day", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-04T10:00:00Z"));
    const key = `d-${Math.random()}`;
    expect(allowDaily(key, 2)).toBe(true);
    expect(allowDaily(key, 2)).toBe(true);
    expect(allowDaily(key, 2)).toBe(false);
    vi.setSystemTime(new Date("2026-07-05T00:01:00Z"));
    expect(allowDaily(key, 2)).toBe(true);
  });
});

describe("LruCache", () => {
  it("stores, expires by TTL, and evicts oldest at capacity", () => {
    vi.useFakeTimers();
    const cache = new LruCache<string>(2, 1000);
    cache.set("a", "1");
    cache.set("b", "2");
    expect(cache.get("a")).toBe("1");
    cache.set("c", "3"); // evicts b (a was refreshed by the get)
    expect(cache.get("b")).toBeUndefined();
    expect(cache.get("a")).toBe("1");
    vi.advanceTimersByTime(1100);
    expect(cache.get("a")).toBeUndefined(); // TTL expiry
  });
});

describe("normalizeQuery", () => {
  it("collapses case and whitespace so trivial variants share a cache entry", () => {
    expect(normalizeQuery("  2001  Forester L ")).toBe("2001 forester l");
    expect(normalizeQuery("2001 FORESTER L")).toBe("2001 forester l");
  });
});
