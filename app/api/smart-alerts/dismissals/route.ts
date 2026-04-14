import { NextRequest, NextResponse } from "next/server";
import { createSupabaseClientForUser } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

function getBearerToken(req: NextRequest): string | null {
  const auth = req.headers.get("authorization") ?? req.headers.get("Authorization");
  if (!auth) return null;
  const match = auth.match(/^Bearer\s+(.+)$/i);
  return match ? match[1].trim() : null;
}

export async function GET(req: NextRequest) {
  const token = getBearerToken(req);
  if (!token) {
    return NextResponse.json({ ok: false, error: "missing_token" }, { status: 401 });
  }

  try {
    const supabase = createSupabaseClientForUser(token);
    const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

    const { data, error } = await supabase
      .from("smart_alert_dismissals")
      .select("alert_id, alert_signature")
      .gt("dismissed_at", cutoff);

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, dismissals: data ?? [] });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "unknown_error";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const token = getBearerToken(req);
  if (!token) {
    return NextResponse.json({ ok: false, error: "missing_token" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  const alertId = (body as { alert_id?: unknown })?.alert_id;
  const alertSignature = (body as { alert_signature?: unknown })?.alert_signature;

  if (
    typeof alertId !== "string" ||
    typeof alertSignature !== "string" ||
    alertId.length === 0 ||
    alertSignature.length === 0 ||
    alertId.length > 200 ||
    alertSignature.length > 200
  ) {
    return NextResponse.json({ ok: false, error: "invalid_input" }, { status: 400 });
  }

  try {
    const supabase = createSupabaseClientForUser(token);
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData?.user) {
      return NextResponse.json({ ok: false, error: "unauthenticated" }, { status: 401 });
    }

    const { error } = await supabase
      .from("smart_alert_dismissals")
      .upsert(
        {
          user_id: userData.user.id,
          alert_id: alertId,
          alert_signature: alertSignature,
        },
        { onConflict: "user_id,alert_id,alert_signature" },
      )
      .select();

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "unknown_error";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
