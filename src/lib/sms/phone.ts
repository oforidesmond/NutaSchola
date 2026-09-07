/**
 * Normalize Ghana phone numbers to `233XXXXXXXXX` (no plus) for SMS APIs.
 * Accepts common local forms: `0XXXXXXXXX`, `+233…`, `233…`, spaced/dashed.
 */
export function normalizeGhPhone(raw: string): string | null {
  const digits = raw.replace(/[^\d+]/g, "").trim();
  if (!digits) return null;

  let normalized = digits;
  if (normalized.startsWith("+")) {
    normalized = normalized.slice(1);
  }

  if (normalized.startsWith("0") && normalized.length === 10) {
    normalized = `233${normalized.slice(1)}`;
  }

  if (normalized.startsWith("233") && normalized.length === 12) {
    return normalized;
  }

  return null;
}

export function uniqueNormalizedPhones(phones: Array<string | null | undefined>): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const phone of phones) {
    if (!phone) continue;
    const normalized = normalizeGhPhone(phone);
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    out.push(normalized);
  }
  return out;
}
