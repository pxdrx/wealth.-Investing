import { NextRequest, NextResponse } from "next/server";
import { getStripe, PRICE_IDS } from "@/lib/stripe";
import { createSupabaseClientForUser } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type PlanInterval = "pro_monthly" | "pro_annual" | "ultra_monthly" | "ultra_annual";

export async function POST(req: NextRequest) {
  const isDev = process.env.NODE_ENV !== "production";
  try {
    if (!process.env.STRIPE_SECRET_KEY) {
      return NextResponse.json(
        { ok: false, error: "Stripe não configurado no servidor." },
        { status: 503 },
      );
    }
    const token = req.headers.get("authorization")?.replace("Bearer ", "");
    if (!token) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

    const supabase = createSupabaseClientForUser(token);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ ok: false, error: "Invalid token" }, { status: 401 });

    // FIX TECH-011: Guard req.json() against malformed request bodies
    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ ok: false, error: "Invalid JSON body" }, { status: 400 });
    }
    // Support both "pro_monthly" and { plan: "pro", interval: "month" } formats
    let planInterval: PlanInterval;
    if (body.interval) {
      const suffix = body.interval === "year" ? "annual" : "monthly";
      planInterval = `${body.plan}_${suffix}` as PlanInterval;
    } else {
      planInterval = body.plan as PlanInterval;
    }
    const priceId = PRICE_IDS[planInterval];
    if (!priceId) {
      console.error("[billing/checkout] Missing price ID for", planInterval, "— env not set in Vercel?");
      return NextResponse.json(
        {
          ok: false,
          error: "Preço não configurado. Env var ausente no servidor.",
          ...(isDev ? { debug: { planInterval, availableKeys: Object.keys(PRICE_IDS).filter(k => PRICE_IDS[k]) } } : {}),
        },
        { status: 503 },
      );
    }

    // Check if user already has a Stripe customer
    const { data: existingSub } = await supabase
      .from("subscriptions")
      .select("stripe_customer_id")
      .eq("user_id", user.id)
      .maybeSingle();

    let customerId = existingSub?.stripe_customer_id;

    if (!customerId) {
      const customer = await getStripe().customers.create({
        email: user.email,
        metadata: { user_id: user.id },
      });
      customerId = customer.id;
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    const session = await getStripe().checkout.sessions.create({
      customer: customerId,
      payment_method_types: ["card"],
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${appUrl}/app/subscription/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/app/pricing`,
      metadata: { user_id: user.id },
      subscription_data: {
        metadata: { user_id: user.id },
      },
      allow_promotion_codes: true,
    });

    return NextResponse.json({ ok: true, url: session.url });
  } catch (err) {
    const e = err as { code?: string; type?: string; message?: string; raw?: { code?: string; message?: string } };
    const code = e?.code || e?.raw?.code;
    const message = e?.message || e?.raw?.message || "Unknown error";
    console.error("[billing/checkout] Error:", { code, type: e?.type, message });
    // Surface common Stripe errors
    if (code === "resource_missing") {
      return NextResponse.json(
        {
          ok: false,
          error: "Preço inválido no Stripe. Verifique STRIPE_*_PRICE_ID no Vercel.",
          ...(isDev ? { debug: { code, message } } : {}),
        },
        { status: 502 },
      );
    }
    return NextResponse.json(
      {
        ok: false,
        error: "Erro ao criar checkout.",
        ...(isDev ? { debug: { code, message } } : {}),
      },
      { status: 500 },
    );
  }
}
