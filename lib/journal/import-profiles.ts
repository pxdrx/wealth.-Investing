// lib/journal/import-profiles.ts
//
// Typed helpers over the `import_profiles` table — one row per (user, format_fingerprint).
// Table is created by a companion migration; schema assumed:
//
//   id UUID PK
//   user_id UUID -> auth.users ON DELETE CASCADE
//   format_fingerprint TEXT NOT NULL
//   broker_guess TEXT
//   separator TEXT
//   encoding TEXT
//   headers TEXT[]
//   column_mapping JSONB NOT NULL
//   date_format TEXT
//   decimal_separator TEXT
//   validated_by_user BOOLEAN DEFAULT false
//   suggested_by TEXT  -- 'parser' | 'claude_haiku' | 'user'
//   success_count INTEGER DEFAULT 0
//   last_used_at TIMESTAMPTZ DEFAULT now()
//   created_at TIMESTAMPTZ DEFAULT now()
//   UNIQUE (user_id, format_fingerprint)

import type { SupabaseClient } from "@supabase/supabase-js";

export interface ImportProfile {
  id: string;
  user_id: string;
  format_fingerprint: string;
  broker_guess: string | null;
  separator: string | null;
  encoding: string | null;
  headers: string[] | null;
  column_mapping: Record<string, unknown>;
  date_format: string | null;
  decimal_separator: string | null;
  validated_by_user: boolean;
  suggested_by: string | null;
  success_count: number;
  last_used_at: string | null;
  created_at: string | null;
}

export type ImportProfileUpsertInput = Partial<ImportProfile> & {
  user_id: string;
  format_fingerprint: string;
  column_mapping: Record<string, unknown>;
};

/** Returns the profile for (user_id, fingerprint) or null if not stored. */
export async function getProfileByFingerprint(
  supabase: SupabaseClient,
  userId: string,
  fingerprint: string
): Promise<ImportProfile | null> {
  const { data, error } = await supabase
    .from("import_profiles")
    .select(
      "id, user_id, format_fingerprint, broker_guess, separator, encoding, headers, column_mapping, date_format, decimal_separator, validated_by_user, suggested_by, success_count, last_used_at, created_at"
    )
    .eq("user_id", userId)
    .eq("format_fingerprint", fingerprint)
    .maybeSingle();

  if (error) {
    // Table might not exist yet in some environments; swallow and return null.
    if ((error.code ?? "").toUpperCase() === "PGRST116") return null;
    console.warn("[import-profiles] getProfileByFingerprint:", error.code, error.message);
    return null;
  }
  return (data as ImportProfile | null) ?? null;
}

/**
 * Upserts a profile keyed on (user_id, format_fingerprint). Never overwrites
 * `success_count`/`last_used_at`/`validated_by_user` blindly — preserves
 * existing values via partial merge semantics handled by caller.
 */
export async function upsertProfile(
  supabase: SupabaseClient,
  input: ImportProfileUpsertInput
): Promise<ImportProfile> {
  const payload: Record<string, unknown> = {
    user_id: input.user_id,
    format_fingerprint: input.format_fingerprint,
    column_mapping: input.column_mapping,
  };
  if (input.broker_guess !== undefined) payload.broker_guess = input.broker_guess;
  if (input.separator !== undefined) payload.separator = input.separator;
  if (input.encoding !== undefined) payload.encoding = input.encoding;
  if (input.headers !== undefined) payload.headers = input.headers;
  if (input.date_format !== undefined) payload.date_format = input.date_format;
  if (input.decimal_separator !== undefined) payload.decimal_separator = input.decimal_separator;
  if (input.validated_by_user !== undefined) payload.validated_by_user = input.validated_by_user;
  if (input.suggested_by !== undefined) payload.suggested_by = input.suggested_by;

  const { data, error } = await supabase
    .from("import_profiles")
    .upsert(payload, { onConflict: "user_id,format_fingerprint" })
    .select(
      "id, user_id, format_fingerprint, broker_guess, separator, encoding, headers, column_mapping, date_format, decimal_separator, validated_by_user, suggested_by, success_count, last_used_at, created_at"
    )
    .maybeSingle();

  if (error) {
    throw new Error(`upsertProfile failed: ${error.code ?? ""} ${error.message}`);
  }
  if (!data) {
    throw new Error("upsertProfile returned no row");
  }
  return data as ImportProfile;
}

/** Flips validated_by_user → true for a profile id. Swallows errors. */
export async function markProfileValidated(
  supabase: SupabaseClient,
  id: string
): Promise<void> {
  const { error } = await supabase
    .from("import_profiles")
    .update({ validated_by_user: true })
    .eq("id", id);
  if (error) {
    console.warn("[import-profiles] markProfileValidated:", error.code, error.message);
  }
}

/**
 * Increments success_count by 1 and refreshes last_used_at. Best-effort —
 * swallows errors (successful import shouldn't fail because the counter did).
 */
export async function recordProfileUsage(
  supabase: SupabaseClient,
  id: string
): Promise<void> {
  // Fetch current counter (no RPC available), then update.
  const { data, error: readErr } = await supabase
    .from("import_profiles")
    .select("success_count")
    .eq("id", id)
    .maybeSingle();
  if (readErr) {
    console.warn("[import-profiles] recordProfileUsage read:", readErr.code, readErr.message);
    return;
  }
  const next = ((data as { success_count?: number } | null)?.success_count ?? 0) + 1;
  const { error } = await supabase
    .from("import_profiles")
    .update({ success_count: next, last_used_at: new Date().toISOString() })
    .eq("id", id);
  if (error) {
    console.warn("[import-profiles] recordProfileUsage update:", error.code, error.message);
  }
}
