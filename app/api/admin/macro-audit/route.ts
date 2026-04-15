// app/api/admin/macro-audit/route.ts
// Admin-only endpoint for auditing and correcting macro calendar/rates data.

import { NextRequest, NextResponse } from "next/server";
import { createSupabaseClientForUser } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { isAdmin } from "@/lib/admin";
import { auditCalendar } from "@/lib/macro/audit/calendar-audit";
import { auditRates } from "@/lib/macro/audit/rates-audit";
import { getWeekStart } from "@/lib/macro/constants";

export const runtime = "nodejs";
export const maxDuration = 120;

async function requireAdmin(req: NextRequest) {
  const token = req.headers.get("authorization")?.replace("Bearer ", "");
  if (!token) return { ok: false as const, status: 401, error: "Não autorizado" };
  const sb = createSupabaseClientForUser(token);
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return { ok: false as const, status: 401, error: "Token inválido" };
  if (!(await isAdmin(sb, user.id))) {
    return { ok: false as const, status: 403, error: "Acesso negado" };
  }
  return { ok: true as const, userId: user.id };
}

export async function GET(req: NextRequest) {
  const gate = await requireAdmin(req);
  if (!gate.ok) return NextResponse.json({ ok: false, error: gate.error }, { status: gate.status });

  const week = req.nextUrl.searchParams.get("week") ?? getWeekStart();

  const [calendar, rates] = await Promise.all([auditCalendar(week), auditRates()]);

  return NextResponse.json({
    ok: true,
    calendar,
    rates,
    generatedAt: new Date().toISOString(),
  });
}

interface EventPatchBody {
  kind: "event";
  event_id: string;
  patch: Partial<{ previous: string | null; forecast: string | null; actual: string | null }>;
}
interface RatePatchBody {
  kind: "rate";
  bank_code: string;
  patch: Partial<{
    current_rate: number;
    last_action: "hold" | "cut" | "hike" | null;
    last_change_bps: number | null;
    last_change_date: string | null;
  }>;
}
type PatchBody = EventPatchBody | RatePatchBody;

export async function POST(req: NextRequest) {
  const gate = await requireAdmin(req);
  if (!gate.ok) return NextResponse.json({ ok: false, error: gate.error }, { status: gate.status });

  let body: PatchBody;
  try {
    body = (await req.json()) as PatchBody;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const service = createServiceRoleClient();

  if (body.kind === "event") {
    if (!body.event_id || !body.patch || Object.keys(body.patch).length === 0) {
      return NextResponse.json({ ok: false, error: "Missing event_id or patch" }, { status: 400 });
    }
    const { error } = await service
      .from("economic_events")
      .update({ ...body.patch, updated_at: new Date().toISOString() })
      .eq("id", body.event_id);
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  if (body.kind === "rate") {
    if (!body.bank_code || !body.patch || Object.keys(body.patch).length === 0) {
      return NextResponse.json({ ok: false, error: "Missing bank_code or patch" }, { status: 400 });
    }
    const { error } = await service
      .from("central_bank_rates")
      .update({ ...body.patch, updated_at: new Date().toISOString() })
      .eq("bank_code", body.bank_code);
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ ok: false, error: "Unknown patch kind" }, { status: 400 });
}
