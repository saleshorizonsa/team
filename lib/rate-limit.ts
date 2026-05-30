// Simple in-memory rate limiter — sufficient for a 3-user internal app.
// For a public-facing app, replace with a Redis-backed solution.

interface Bucket {
  count: number;
  resetAt: number;
}

const store = new Map<string, Bucket>();

export function checkRateLimit(
  key: string,
  limit = 10,
  windowMs = 15 * 60 * 1000 // 15 minutes
): boolean {
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || now > entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }

  if (entry.count >= limit) return false;

  entry.count++;
  return true;
}

export function clearRateLimit(key: string): void {
  store.delete(key);
}
