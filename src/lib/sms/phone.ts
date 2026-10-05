/**
 * Normalize Ghana phone numbers to `233XXXXXXXXX` (no plus) for SMS APIs.
 * Accepts: `0XXXXXXXXX`, `+233…`, `233…`, spaced/dashed, and 9-digit
 * numbers missing a leading `0` (Excel often strips it).
 */
export function normalizeGhPhone(raw: string): string | null {
  const digits = raw.replace(/[^\d+]/g, "").trim();
  if (!digits) return null;

  let normalized = digits;
  if (normalized.startsWith("+")) {
    normalized = normalized.slice(1);
  }

  // Excel numeric cells drop the leading 0 from local Ghana numbers.
  if (normalized.length === 9 && !normalized.startsWith("233")) {
    normalized = `0${normalized}`;
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

/**
 * Split a free-form phone list (commas, semicolons, whitespace, newlines)
 * into unique Ghana-normalized numbers. Invalid tokens are skipped.
 * Returns original raw tokens that normalized successfully (first occurrence wins).
 */
export function parseGhPhoneList(raw: string): { phones: string[]; invalidCount: number } {
  const tokens = raw
    .split(/[,;\s]+/)
    .map((t) => t.trim())
    .filter(Boolean);

  const seen = new Set<string>();
  const phones: string[] = [];
  let invalidCount = 0;

  for (const token of tokens) {
    const normalized = normalizeGhPhone(token);
    if (!normalized) {
      invalidCount += 1;
      continue;
    }
    if (seen.has(normalized)) continue;
    seen.add(normalized);
    phones.push(token);
  }

  return { phones, invalidCount };
}
