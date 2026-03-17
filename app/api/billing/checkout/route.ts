import { NextRequest, NextResponse } from "next/server";
import { getStripe, PRICE_IDS } from "@/lib/stripe";
import { createSupabaseClientForUser } from "@/lib/supabase/server";

type PlanInterval = "pro_monthly" | "pro_annual" | "elite_monthly" | "elite_annual";

export async function POST(req: NextRequest) {
  try {
    const token = req.headers.get("authorization")?.replace("Bearer ", "");
    if (!token) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

    const supabase = createSupabaseClientForUser(token);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ ok: false, error: "Invalid token" }, { status: 401 });

    const body = await req.json();
    // Support both "pro_monthly" and { plan: "pro", interval: "month" } formats
    let planInterval: PlanInterval;
    if (body.interval) {
      const suffix = body.interval === "year" ? "annual" : "monthly";
      planInterval = `${body.plan}_${suffix}` as PlanInterval;
    } else {
      planInterval = body.plan as PlanInterval;
    }
    const priceId = PRICE_IDS[planInterval];
    if (!priceId) return NextResponse.json({ ok: false, error: "Invalid plan" }, { status: 400 });

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

    const origin = req.headers.get("origin") || "http://localhost:3000";

    const session = await getStripe().checkout.sessions.create({
      customer: customerId,
      payment_method_types: ["card"],
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${origin}/app/subscription/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/app/pricing`,
      metadata: { user_id: user.id },
      subscription_data: {
        metadata: { user_id: user.id },
      },
      allow_promotion_codes: true,
    });

    return NextResponse.json({ ok: true, url: session.url });
  } catch (err) {
    console.error("[billing/checkout] Error:", err);
    return NextResponse.json({ ok: false, error: "Internal error" }, { status: 500 });
  }
}
