// lib/journal/alias-vocabulary.ts
//
// Global alias vocabulary shared across users. Each entry maps a raw CSV
// header (alias) to a canonical field name. The adaptive parser merges these
// DB-backed aliases on top of its static dictionary so the system slowly
// learns any new broker format without code changes.
//
// Table schema (created by companion migration):
//   canonical_field TEXT NOT NULL
//   alias TEXT NOT NULL
//   source TEXT NOT NULL      -- 'user_confirmed' | 'claude_haiku' | 'system_seed'
//   confidence NUMERIC DEFAULT 1.0
//   seen_count INTEGER DEFAULT 1
//   last_seen_at TIMESTAMPTZ DEFAULT now()
//   UNIQUE (canonical_field, alias)

import type { SupabaseClient } from "@supabase/supabase-js";

export interface AliasEntry {
  canonical_field: string;
  alias: string;
  source: string;
  confidence: number;
  seen_count: number;
}

interface CacheRecord {
  data: Record<string, string[]>;
  expiresAt: number;
}

const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes
let cache: CacheRecord | null = null;

function normalizeAlias(s: string): string {
  return (s ?? "")
    .toString()
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Loads the full vocabulary as `{ canonical_field: [alias, ...] }` — always
 * hits DB (use `getCachedVocabulary` for repeated calls).
 */
export async function loadVocabulary(
  supabase: SupabaseClient
): Promise<Record<string, string[]>> {
  const { data, error } = await supabase
    .from("import_alias_vocabulary")
    .select("canonical_field, alias");

  if (error) {
    console.warn("[alias-vocabulary] loadVocabulary:", error.code, error.message);
    return {};
  }

  const out: Record<string, string[]> = {};
  for (const row of (data ?? []) as Array<{ canonical_field: string; alias: string }>) {
    const field = row.canonical_field?.trim();
    const alias = row.alias?.trim();
    if (!field || !alias) continue;
    if (!out[field]) out[field] = [];
    out[field].push(alias);
  }
  return out;
}

/**
 * Cached variant — memoized for 10 min in-module. Safe for warm Vercel
 * serverless invocations; cold starts naturally refresh.
 */
export async function getCachedVocabulary(
  supabase: SupabaseClient
): Promise<Record<string, string[]>> {
  const now = Date.now();
  if (cache && cache.expiresAt > now) {
    return cache.data;
  }
  const data = await loadVocabulary(supabase);
  cache = { data, expiresAt: now + CACHE_TTL_MS };
  return data;
}

/** Clears the in-module cache — useful in tests or after explicit updates. */
export function clearVocabularyCache(): void {
  cache = null;
}

/**
 * UPSERTs a batch of {canonical, alias, source} pairs. On conflict, increments
 * seen_count and refreshes last_seen_at. Best-effort — swallows errors so the
 * import flow never fails because of vocab plumbing.
 */
export async function recordAliases(
  supabase: SupabaseClient,
  pairs: Array<{ canonical_field: string; alias: string; source: string }>
): Promise<void> {
  if (!pairs || pairs.length === 0) return;

  // Deduplicate on (canonical_field, alias_normalized) — avoids two rows of
  // the same pair inside one payload triggering the unique-violation branch.
  const seen = new Set<string>();
  const unique: Array<{ canonical_field: string; alias: string; source: string }> = [];
  for (const p of pairs) {
    const field = p.canonical_field?.trim();
    const aliasNorm = normalizeAlias(p.alias);
    if (!field || !aliasNorm) continue;
    const key = `${field}::${aliasNorm}`;
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push({ canonical_field: field, alias: aliasNorm, source: p.source ?? "parser" });
  }

  // Fetch existing rows to know which ones already have counters to bump.
  const { data: existing, error: readErr } = await supabase
    .from("import_alias_vocabulary")
    .select("canonical_field, alias, seen_count")
    .in(
      "alias",
      unique.map((u) => u.alias)
    );

  if (readErr) {
    console.warn("[alias-vocabulary] recordAliases read:", readErr.code, readErr.message);
    // Fall back to plain upsert with seen_count=1; conflict = update without bump.
  }

  const counterMap = new Map<string, number>();
  for (const row of (existing ?? []) as Array<{ canonical_field: string; alias: string; seen_count: number }>) {
    counterMap.set(`${row.canonical_field}::${row.alias}`, row.seen_count ?? 1);
  }

  const payload = unique.map((u) => {
    const key = `${u.canonical_field}::${u.alias}`;
    const prev = counterMap.get(key) ?? 0;
    return {
      canonical_field: u.canonical_field,
      alias: u.alias,
      source: u.source,
      seen_count: prev + 1,
      last_seen_at: new Date().toISOString(),
    };
  });

  const { error } = await supabase
    .from("import_alias_vocabulary")
    .upsert(payload, { onConflict: "canonical_field,alias" });

  if (error) {
    console.warn("[alias-vocabulary] recordAliases upsert:", error.code, error.message);
    return;
  }

  // Invalidate cache so next import sees the new aliases.
  cache = null;
}
