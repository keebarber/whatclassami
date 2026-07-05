/**
 * Zero-dependency guardrails for the assist endpoint.
 *
 * State is per serverless instance (in-memory). That's imperfect for global
 * enforcement, but combined with tight per-request token caps and the
 * Anthropic Console spend limit it bounds worst-case cost to pocket change.
 * Swap for Upstash/Vercel KV if the site ever earns real traffic.
 */

interface Window {
  timestamps: number[];
}

const SLIDING = new Map<string, Window>();
const DAILY = new Map<string, { day: string; count: number }>();

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Sliding-window check: at most `max` hits per `windowMs` for this key. */
export function allowSliding(key: string, max: number, windowMs: number): boolean {
  const now = Date.now();
  const w = SLIDING.get(key) ?? { timestamps: [] };
  w.timestamps = w.timestamps.filter((t) => now - t < windowMs);
  if (w.timestamps.length >= max) {
    SLIDING.set(key, w);
    return false;
  }
  w.timestamps.push(now);
  SLIDING.set(key, w);
  // Opportunistic cleanup so the map can't grow unbounded.
  if (SLIDING.size > 5000) {
    for (const [k, v] of SLIDING) {
      if (v.timestamps.every((t) => now - t >= windowMs)) SLIDING.delete(k);
    }
  }
  return true;
}

/** Daily counter: at most `max` hits per UTC day for this key. */
export function allowDaily(key: string, max: number): boolean {
  const d = today();
  const entry = DAILY.get(key);
  if (!entry || entry.day !== d) {
    DAILY.set(key, { day: d, count: 1 });
    return true;
  }
  if (entry.count >= max) return false;
  entry.count += 1;
  return true;
}

/** Tiny LRU + TTL cache for deduplicating identical requests. */
export class LruCache<V> {
  private map = new Map<string, { value: V; expires: number }>();
  constructor(
    private maxEntries: number,
    private ttlMs: number,
  ) {}

  get(key: string): V | undefined {
    const e = this.map.get(key);
    if (!e) return undefined;
    if (Date.now() > e.expires) {
      this.map.delete(key);
      return undefined;
    }
    // refresh recency
    this.map.delete(key);
    this.map.set(key, e);
    return e.value;
  }

  set(key: string, value: V): void {
    if (this.map.size >= this.maxEntries) {
      const oldest = this.map.keys().next().value;
      if (oldest !== undefined) this.map.delete(oldest);
    }
    this.map.set(key, { value, expires: Date.now() + this.ttlMs });
  }
}

/** Normalize free text so trivial variations share a cache entry. */
export function normalizeQuery(s: string): string {
  return s.toLowerCase().replace(/\s+/g, " ").trim();
}
