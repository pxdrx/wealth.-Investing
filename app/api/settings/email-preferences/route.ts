// app/api/settings/email-preferences/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createSupabaseClientForUser } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function PATCH(req: NextRequest) {
  const auth = req.headers.get("authorization");
  const token = auth?.startsWith("Bearer ") ? auth.slice(7) : null;
  if (!token) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });

  const body = (await req.json().catch(() => null)) as { recapEnabled?: boolean } | null;
  if (typeof body?.recapEnabled !== "boolean") {
    return NextResponse.json({ ok: false, error: "invalid_body" }, { status: 400 });
  }

  const sb = createSupabaseClientForUser(token);
  const { data: u, error: ue } = await sb.auth.getUser();
  if (ue || !u.user) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });

  const { error } = await sb
    .from("profiles")
    .update({ recap_enabled: body.recapEnabled })
    .eq("id", u.user.id);
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, recapEnabled: body.recapEnabled });
}
