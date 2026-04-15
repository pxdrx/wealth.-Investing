import { NextResponse } from "next/server";
import { createSupabaseClientForUser } from "@/lib/supabase/server";
import { validateAccountOwnership } from "@/lib/account-validation";

export const runtime = "nodejs";

const ALLOWED_FIELDS = [
  "firm_name",
  "phase",
  "total_phases",
  "starting_balance_usd",
  "profit_target_percent",
  "max_daily_loss_percent",
  "max_overall_loss_percent",
  "drawdown_type",
  "trail_lock_threshold_usd",
  "trail_locked_floor_usd",
  "reset_timezone",
  "reset_rule",
] as const;

const PHASE_VALUES = new Set(["phase_1", "phase_2", "phase_3", "funded"]);
const DRAWDOWN_TYPES = new Set(["static", "trailing", "eod"]);

function coerceNumber(v: unknown): number | null | undefined {
  if (v === null) return null;
  if (v === undefined || v === "") return undefined;
  const n = typeof v === "number" ? v : parseFloat(String(v));
  return Number.isFinite(n) ? n : undefined;
}

export async function PATCH(request: Request) {
  const auth = request.headers.get("Authorization");
  const token = auth?.startsWith("Bearer ") ? auth.slice(7) : null;
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { account_id, patch } = (body ?? {}) as {
    account_id?: string;
    patch?: Record<string, unknown>;
  };

  if (!account_id || typeof account_id !== "string") {
    return NextResponse.json({ error: "Missing account_id" }, { status: 400 });
  }
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(account_id)) {
    return NextResponse.json({ error: "Invalid account_id format" }, { status: 400 });
  }
  if (!patch || typeof patch !== "object") {
    return NextResponse.json({ error: "Missing patch" }, { status: 400 });
  }

  const supabase = createSupabaseClientForUser(token);
  const { data: userRes, error: userError } = await supabase.auth.getUser(token);
  if (userError || !userRes.user?.id) {
    return NextResponse.json({ error: "Invalid token" }, { status: 401 });
  }
  const userId = userRes.user.id;

  const owned = await validateAccountOwnership(supabase, account_id, userId);
  if (!owned) {
    return NextResponse.json({ error: "Account not found" }, { status: 403 });
  }
  if (owned.kind !== "prop") {
    return NextResponse.json({ error: "Not a prop account" }, { status: 400 });
  }

  const cleanPatch: Record<string, unknown> = {};
  for (const field of ALLOWED_FIELDS) {
    if (!(field in patch)) continue;
    const raw = (patch as Record<string, unknown>)[field];
    switch (field) {
      case "firm_name":
      case "reset_timezone":
      case "reset_rule":
        if (typeof raw === "string" && raw.trim().length > 0) {
          cleanPatch[field] = raw.trim();
        }
        break;
      case "phase":
        if (typeof raw === "string" && PHASE_VALUES.has(raw)) {
          cleanPatch[field] = raw;
        } else {
          return NextResponse.json({ error: "Invalid phase" }, { status: 400 });
        }
        break;
      case "drawdown_type":
        if (typeof raw === "string" && DRAWDOWN_TYPES.has(raw)) {
          cleanPatch[field] = raw;
        } else {
          return NextResponse.json({ error: "Invalid drawdown_type" }, { status: 400 });
        }
        break;
      case "total_phases": {
        const n = coerceNumber(raw);
        if (n === undefined) continue;
        if (n === null || n < 0 || n > 3 || !Number.isInteger(n)) {
          return NextResponse.json({ error: "total_phases must be 0-3" }, { status: 400 });
        }
        cleanPatch[field] = n;
        break;
      }
      case "starting_balance_usd":
      case "profit_target_percent":
      case "max_daily_loss_percent":
      case "max_overall_loss_percent": {
        const n = coerceNumber(raw);
        if (n === undefined) continue;
        if (n === null) {
          return NextResponse.json({ error: `${field} cannot be null` }, { status: 400 });
        }
        if (n < 0) {
          return NextResponse.json({ error: `${field} must be ≥ 0` }, { status: 400 });
        }
        cleanPatch[field] = n;
        break;
      }
      case "trail_lock_threshold_usd":
      case "trail_locked_floor_usd": {
        const n = coerceNumber(raw);
        if (n === undefined) continue;
        cleanPatch[field] = n; // null allowed
        break;
      }
    }
  }

  if (Object.keys(cleanPatch).length === 0) {
    return NextResponse.json({ error: "Empty patch" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("prop_accounts")
    .update(cleanPatch)
    .eq("account_id", account_id)
    .eq("user_id", userId)
    .select("account_id, firm_name, phase, total_phases, starting_balance_usd, profit_target_percent, max_daily_loss_percent, max_overall_loss_percent, reset_timezone, reset_rule, drawdown_type, trail_lock_threshold_usd, trail_locked_floor_usd")
    .maybeSingle();

  if (error) {
    console.error("[prop-account/update] supabase error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ error: "Prop account row not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true, prop: data });
}
