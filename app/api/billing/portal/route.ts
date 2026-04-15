import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { getStripe } from "@/lib/stripe";
import { createSupabaseClientForUser } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const isDev = process.env.NODE_ENV !== "production";

export async function POST(req: NextRequest) {
  try {
    const token = req.headers.get("authorization")?.replace("Bearer ", "");
    if (!token) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

    if (!process.env.STRIPE_SECRET_KEY) {
      console.error("[billing/portal] STRIPE_SECRET_KEY missing");
      return NextResponse.json(
        { ok: false, error: "Pagamento indisponível. Tente novamente em instantes.", code: "stripe_not_configured" },
        { status: 503 },
      );
    }

    const supabase = createSupabaseClientForUser(token);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ ok: false, error: "Invalid token" }, { status: 401 });

    let intent: "cancel" | "manage" = "manage";
    try {
      const body = await req.json();
      if (body?.intent === "cancel") intent = "cancel";
    } catch {
      // no body — ok, default manage
    }

    const { data: sub, error: subErr } = await supabase
      .from("subscriptions")
      .select("stripe_customer_id, stripe_subscription_id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (subErr) {
      console.error("[billing/portal] subscriptions query error", subErr);
      return NextResponse.json(
        { ok: false, error: "Erro ao buscar assinatura.", code: "db_error" },
        { status: 500 },
      );
    }

    if (!sub?.stripe_customer_id) {
      return NextResponse.json(
        { ok: false, error: "Você ainda não tem uma assinatura ativa.", code: "no_subscription" },
        { status: 404 },
      );
    }

    const origin = req.headers.get("origin") || process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

    try {
      const params: Stripe.BillingPortal.SessionCreateParams = {
        customer: sub.stripe_customer_id,
        return_url: `${origin}/app/settings`,
      };

      if (intent === "cancel" && sub.stripe_subscription_id) {
        params.flow_data = {
          type: "subscription_cancel",
          subscription_cancel: { subscription: sub.stripe_subscription_id },
          after_completion: {
            type: "redirect",
            redirect: { return_url: `${origin}/app/settings?canceled=1` },
          },
        };
      }

      const session = await getStripe().billingPortal.sessions.create(params);
      return NextResponse.json({ ok: true, url: session.url });
    } catch (stripeErr) {
      const err = stripeErr as Stripe.errors.StripeError;
      const code = err?.code || err?.type || "stripe_error";
      console.error("[billing/portal] Stripe error", {
        message: err?.message,
        code: err?.code,
        type: err?.type,
        statusCode: err?.statusCode,
      });

      // Self-heal: stale customer_id (common after test↔live switch). Clear it
      // so the next checkout creates a fresh one in the current Stripe mode.
      if (err?.code === "resource_missing" && (err?.message || "").includes("No such customer")) {
        await supabase
          .from("subscriptions")
          .update({ stripe_customer_id: null })
          .eq("user_id", user.id);
        return NextResponse.json(
          {
            ok: false,
            error: "Sua assinatura precisa ser revinculada. Abra uma nova no /app/pricing.",
            code: "stale_customer",
          },
          { status: 404 },
        );
      }

      const portalInactive =
        err?.code === "billing_portal_configuration_inactive" ||
        (err?.message || "").toLowerCase().includes("customer portal");

      if (portalInactive) {
        return NextResponse.json(
          {
            ok: false,
            error: "Portal de cobrança ainda não configurado. Fale com o suporte.",
            code: "portal_not_configured",
            ...(isDev ? { debug: err?.message } : {}),
          },
          { status: 502 },
        );
      }

      return NextResponse.json(
        {
          ok: false,
          error: "Não foi possível abrir o portal. Tente novamente.",
          code,
          ...(isDev ? { debug: err?.message } : {}),
        },
        { status: 502 },
      );
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : "unknown";
    console.error("[billing/portal] Unexpected error:", msg, err);
    return NextResponse.json(
      {
        ok: false,
        error: "Erro inesperado. Tente novamente.",
        code: "internal",
        ...(isDev ? { debug: msg } : {}),
      },
      { status: 500 },
    );
  }
}
