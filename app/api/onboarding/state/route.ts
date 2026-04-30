import { NextResponse } from "next/server";
import { createSupabaseClientForUser } from "@/lib/supabase/server";
import {
  TIER_RANK,
  isTierName,
  type OnboardingState,
  type TierName,
} from "@/lib/onboarding/types";

export const runtime = "nodejs";

interface DbRow {
  user_id: string;
  tour_completed_at: string | null;
  max_tier_seen: TierName;
  updated_at: string;
}

function rowToState(row: DbRow | null): OnboardingState {
  if (!row) {
    return { tourCompletedAt: null, maxTierSeen: "free" };
  }
  const tier: TierName = isTierName(row.max_tier_seen) ? row.max_tier_seen : "free";
  return {
    tourCompletedAt: row.tour_completed_at,
    maxTierSeen: tier,
  };
}

function extractToken(request: Request): string | null {
  const auth = request.headers.get("Authorization");
  if (!auth?.startsWith("Bearer ")) return null;
  const token = auth.slice(7).trim();
  return token.length > 0 ? token : null;
}

/**
 * GET /api/onboarding/state
 *
 * Returns the user's onboarding state. Auto-creates a default row
 * (`{ tourCompletedAt: null, maxTierSeen: 'free' }`) on first read so the
 * client never has to handle a "not found" case.
 */
export async function GET(request: Request) {
  const token = extractToken(request);
  if (!token) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createSupabaseClientForUser(token);
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser(token);
  if (userError || !user?.id) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  // SELECT first — avoids a write on every read.
  const { data: existing, error: selectErr } = await supabase
    .from("user_onboarding")
    .select("user_id, tour_completed_at, max_tier_seen, updated_at")
    .eq("user_id", user.id)
    .maybeSingle();

  if (selectErr) {
    console.error("[onboarding/state GET] select failed:", selectErr.code, selectErr.message);
    return NextResponse.json(
      { ok: false, error: "Failed to load onboarding state" },
      { status: 500 }
    );
  }

  if (existing) {
    return NextResponse.json({ ok: true, state: rowToState(existing as DbRow) });
  }

  // INSERT default row, race-safe via on_conflict do nothing.
  const { data: inserted, error: insertErr } = await supabase
    .from("user_onboarding")
    .upsert(
      { user_id: user.id, max_tier_seen: "free" },
      { onConflict: "user_id", ignoreDuplicates: true }
    )
    .select("user_id, tour_completed_at, max_tier_seen, updated_at")
    .maybeSingle();

  if (insertErr) {
    console.error("[onboarding/state GET] insert failed:", insertErr.code, insertErr.message);
    // Non-blocking — fall through to default state.
  }

  return NextResponse.json({
    ok: true,
    state: rowToState((inserted as DbRow | null) ?? null),
  });
}

interface PostBody {
  tourCompletedAt?: string | null;
  maxTierSeen?: TierName;
}

function parseBody(raw: unknown): { ok: true; body: PostBody } | { ok: false; error: string } {
  if (!raw || typeof raw !== "object") {
    return { ok: false, error: "Invalid body" };
  }
  const obj = raw as Record<string, unknown>;
  const out: PostBody = {};

  if ("tourCompletedAt" in obj) {
    const v = obj.tourCompletedAt;
    if (v === null) {
      out.tourCompletedAt = null;
    } else if (typeof v === "string" && v.length > 0) {
      const ts = Date.parse(v);
      if (Number.isNaN(ts)) {
        return { ok: false, error: "tourCompletedAt must be a valid ISO timestamp" };
      }
      out.tourCompletedAt = new Date(ts).toISOString();
    } else {
      return { ok: false, error: "tourCompletedAt must be ISO string or null" };
    }
  }

  if ("maxTierSeen" in obj) {
    const v = obj.maxTierSeen;
    if (!isTierName(v)) {
      return { ok: false, error: "maxTierSeen must be 'free' | 'pro' | 'ultra' | 'mentor'" };
    }
    out.maxTierSeen = v;
  }

  if (out.tourCompletedAt === undefined && out.maxTierSeen === undefined) {
    return { ok: false, error: "At least one of tourCompletedAt or maxTierSeen is required" };
  }

  return { ok: true, body: out };
}

/**
 * POST /api/onboarding/state
 * Body: { tourCompletedAt?: string | null, maxTierSeen?: TierName }
 *
 * Updates the caller's onboarding row. `maxTierSeen` only advances forward
 * (rank: free=0, pro=1, ultra=2, mentor=3) — supplying a lower tier than the
 * stored value is a no-op for that field.
 */
export async function POST(request: Request) {
  const token = extractToken(request);
  if (!token) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createSupabaseClientForUser(token);
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser(token);
  if (userError || !user?.id) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = parseBody(raw);
  if (!parsed.ok) {
    return NextResponse.json({ ok: false, error: parsed.error }, { status: 400 });
  }
  const body = parsed.body;

  // Read current row to compute non-regressing maxTierSeen.
  const { data: existing, error: readErr } = await supabase
    .from("user_onboarding")
    .select("user_id, tour_completed_at, max_tier_seen, updated_at")
    .eq("user_id", user.id)
    .maybeSingle();

  if (readErr) {
    console.error("[onboarding/state POST] read failed:", readErr.code, readErr.message);
    return NextResponse.json(
      { ok: false, error: "Failed to load existing state" },
      { status: 500 }
    );
  }

  const current = rowToState(existing as DbRow | null);
  const nextTier: TierName =
    body.maxTierSeen !== undefined &&
    TIER_RANK[body.maxTierSeen] > TIER_RANK[current.maxTierSeen]
      ? body.maxTierSeen
      : current.maxTierSeen;

  const nextTourCompletedAt: string | null =
    body.tourCompletedAt !== undefined ? body.tourCompletedAt : current.tourCompletedAt;

  const payload = {
    user_id: user.id,
    tour_completed_at: nextTourCompletedAt,
    max_tier_seen: nextTier,
    updated_at: new Date().toISOString(),
  };

  const { data: upserted, error: upsertErr } = await supabase
    .from("user_onboarding")
    .upsert(payload, { onConflict: "user_id" })
    .select("user_id, tour_completed_at, max_tier_seen, updated_at")
    .maybeSingle();

  if (upsertErr) {
    console.error("[onboarding/state POST] upsert failed:", upsertErr.code, upsertErr.message);
    return NextResponse.json(
      { ok: false, error: "Failed to save onboarding state" },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true, state: rowToState(upserted as DbRow | null) });
}
