// POST /api/email/welcome/start
// Called from onboarding after display_name save. JWT-authed (user's session).
// Idempotent — re-calling for same user is a no-op via UNIQUE(user_id,template).

import { NextRequest, NextResponse } from "next/server";
import { createSupabaseClientForUser } from "@/lib/supabase/server";
import { scheduleWelcome } from "@/email-engine/sequences/welcome";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const auth = req.headers.get("authorization") ?? "";
  const token = auth.replace(/^Bearer\s+/i, "").trim();
  if (!token) {
    return NextResponse.json({ ok: false, error: "missing token" }, { status: 401 });
  }

  const sb = createSupabaseClientForUser(token);
  const { data: userRes, error: userErr } = await sb.auth.getUser();
  if (userErr || !userRes?.user) {
    return NextResponse.json({ ok: false, error: "invalid session" }, { status: 401 });
  }
  const user = userRes.user;
  const email = user.email;
  if (!email) {
    return NextResponse.json({ ok: false, error: "user has no email" }, { status: 400 });
  }

  const { data: profile } = await sb
    .from("profiles")
    .select("display_name,preferred_locale")
    .eq("id", user.id)
    .maybeSingle();

  const firstName =
    profile?.display_name?.toString().trim() ||
    email.split("@")[0] ||
    "amigo";

  const locale = profile?.preferred_locale === "en" ? "en-US" : "pt-BR";

  const result = await scheduleWelcome({
    userId: user.id,
    email,
    firstName,
    locale,
  });

  return NextResponse.json({ ok: true, ...result });
}
