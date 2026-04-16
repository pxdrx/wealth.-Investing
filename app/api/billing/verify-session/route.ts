import { NextRequest, NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import { createSupabaseClientForUser } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  try {
    const token = req.headers.get("authorization")?.replace("Bearer ", "");
    if (!token) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const supabase = createSupabaseClientForUser(token);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ ok: false, error: "Invalid token" }, { status: 401 });
    }

    const sessionId = req.nextUrl.searchParams.get("session_id");
    if (!sessionId) {
      return NextResponse.json({ ok: false, error: "Missing session_id" }, { status: 400 });
    }

    const session = await getStripe().checkout.sessions.retrieve(sessionId);

    // Verify this session belongs to the authenticated user
    if (session.metadata?.user_id !== user.id) {
      return NextResponse.json({ ok: false, error: "Session mismatch" }, { status: 403 });
    }

    const paid = session.payment_status === "paid";
    const plan = session.metadata?.plan ?? null;

    return NextResponse.json({
      ok: true,
      verified: paid,
      plan,
      status: session.status,
      payment_status: session.payment_status,
    });
  } catch (err) {
    console.error("[billing/verify-session] Error:", err);
    return NextResponse.json({ ok: false, error: "Verification failed" }, { status: 500 });
  }
}
