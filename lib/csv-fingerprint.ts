// lib/csv-fingerprint.ts
//
// Deterministic fingerprint for CSV formats.
// Stable across a given broker/export template (same separator, encoding,
// and header set → same hash). Used as lookup key in `import_profiles` so
// second upload of an already-seen format skips the parser learning phase.

import { createHash } from "node:crypto";

function normalizeHeader(h: string): string {
  return (h ?? "")
    .toString()
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Returns a stable 16-char hex SHA1 over `separator + '|' + encoding + '|' + sorted(normalized(headers)).join(',')`.
 *
 * Normalization: lowercase → trim → strip accents → collapse whitespace.
 * Headers are sorted after normalization so column order doesn't change the id.
 */
export function computeFingerprint(params: {
  separator: string;
  encoding: string;
  headers: string[];
}): string {
  const separator = params.separator ?? "";
  const encoding = (params.encoding ?? "").toLowerCase();
  const normalized = (params.headers ?? [])
    .map(normalizeHeader)
    .filter((h) => h.length > 0);
  normalized.sort();
  const basis = `${separator}|${encoding}|${normalized.join(",")}`;
  return createHash("sha1").update(basis).digest("hex").slice(0, 16);
}
