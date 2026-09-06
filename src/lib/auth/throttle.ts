/**
 * Simple in-memory cooldown throttle for auth endpoints.
 * Per-process only — not shared across serverless instances (documented limitation).
 */

type Bucket = { lastAt: number };

const buckets = new Map<string, Bucket>();

const DEFAULT_COOLDOWN_MS = 60_000;

export function assertNotThrottled(
  key: string,
  cooldownMs: number = DEFAULT_COOLDOWN_MS,
): { ok: true } | { ok: false; retryAfterSeconds: number } {
  const now = Date.now();
  const existing = buckets.get(key);
  if (existing && now - existing.lastAt < cooldownMs) {
    const retryAfterSeconds = Math.ceil((cooldownMs - (now - existing.lastAt)) / 1000);
    return { ok: false, retryAfterSeconds };
  }
  buckets.set(key, { lastAt: now });
  return { ok: true };
}

/** Best-effort client IP from common proxy headers. */
export function clientIpFromHeaders(headers: Headers | null | undefined): string {
  if (!headers) return "unknown";
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  return headers.get("x-real-ip")?.trim() || "unknown";
}
