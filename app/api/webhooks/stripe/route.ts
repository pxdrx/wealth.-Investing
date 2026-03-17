import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { getStripe, planFromPriceId } from "@/lib/stripe";
import { createClient } from "@supabase/supabase-js";

/** Extract current_period_end from a subscription object.
 *  Stripe v20 removed the typed field but the API still returns it. */
function getPeriodEnd(sub: Record<string, unknown>): string | null {
  const val = sub.current_period_end as number | undefined;
  if (typeof val === "number") return new Date(val * 1000).toISOString();
  return null;
}

// Use service role for webhook (no user context)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig = req.headers.get("stripe-signature");

  if (!sig || !process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error("[stripe-webhook] Signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  // Idempotency check
  const { data: existing } = await supabaseAdmin
    .from("subscriptions")
    .select("id")
    .eq("stripe_event_id", event.id)
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ ok: true, message: "Already processed" });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.user_id;
        const customerId = session.customer as string;
        const subscriptionId = session.subscription as string;

        if (!userId) break;

        const sub = await getStripe().subscriptions.retrieve(subscriptionId);
        const priceId = sub.items.data[0]?.price.id;
        const plan = planFromPriceId(priceId ?? "") ?? "pro";

        await supabaseAdmin.from("subscriptions").upsert({
          user_id: userId,
          stripe_customer_id: customerId,
          stripe_subscription_id: subscriptionId,
          stripe_event_id: event.id,
          plan,
          status: "active",
          current_period_end: getPeriodEnd(sub as unknown as Record<string, unknown>),
          cancel_at_period_end: sub.cancel_at_period_end,
          updated_at: new Date().toISOString(),
        }, { onConflict: "user_id" });
        break;
      }

      case "customer.subscription.updated": {
        const sub = event.data.object as Stripe.Subscription;
        const userId = sub.metadata?.user_id;
        if (!userId) break;

        const priceId = sub.items.data[0]?.price.id;
        const plan = planFromPriceId(priceId ?? "");

        await supabaseAdmin.from("subscriptions").upsert({
          user_id: userId,
          stripe_customer_id: sub.customer as string,
          stripe_subscription_id: sub.id,
          stripe_event_id: event.id,
          plan: plan ?? "free",
          status: sub.status === "active" ? "active"
            : sub.status === "past_due" ? "past_due"
            : sub.status === "canceled" ? "canceled"
            : sub.status === "trialing" ? "trialing"
            : "incomplete",
          current_period_end: getPeriodEnd(sub as unknown as Record<string, unknown>),
          cancel_at_period_end: sub.cancel_at_period_end,
          updated_at: new Date().toISOString(),
        }, { onConflict: "user_id" });
        break;
      }

      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        const userId = sub.metadata?.user_id;
        if (!userId) break;

        await supabaseAdmin.from("subscriptions").update({
          plan: "free",
          status: "canceled",
          stripe_event_id: event.id,
          cancel_at_period_end: false,
          updated_at: new Date().toISOString(),
        }).eq("user_id", userId);
        break;
      }
    }
  } catch (err) {
    console.error("[stripe-webhook] Processing error:", err);
    return NextResponse.json({ error: "Processing failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
