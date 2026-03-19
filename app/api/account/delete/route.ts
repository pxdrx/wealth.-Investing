import { NextRequest, NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import { createSupabaseClientForUser } from "@/lib/supabase/server";
import { createClient } from "@supabase/supabase-js";

export async function DELETE(req: NextRequest) {
  try {
    const token = req.headers.get("authorization")?.replace("Bearer ", "");
    if (!token) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

    const supabase = createSupabaseClientForUser(token);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ ok: false, error: "Invalid token" }, { status: 401 });

    const userId = user.id;

    // 1. Cancel Stripe subscription if exists
    const { data: sub } = await supabase
      .from("subscriptions")
      .select("stripe_customer_id, stripe_subscription_id")
      .eq("user_id", userId)
      .maybeSingle();

    if (sub?.stripe_subscription_id) {
      try {
        await getStripe().subscriptions.cancel(sub.stripe_subscription_id);
      } catch (err) {
        console.error("[account/delete] Stripe cancel error:", err);
      }
    }

    // 2. Delete user data (order matters for FK constraints)
    const tables = [
      "ai_usage",
      "journal_trades",
      "prop_alerts",
      "prop_payouts",
      "prop_accounts",
      "wallet_transactions",
      "tv_alerts",
      "ingestion_logs",
      "subscriptions",
      "accounts",
      "profiles",
    ];

    for (const table of tables) {
      const { error } = await supabase.from(table).delete().eq("user_id", userId);
      if (error) console.error(`[account/delete] Failed to delete from ${table}:`, error.message);
    }

    // 3. Delete auth user (requires service role)
    const serviceSupabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );
    const { error: authError } = await serviceSupabase.auth.admin.deleteUser(userId);
    if (authError) {
      console.error("[account/delete] Auth delete error:", authError.message);
      return NextResponse.json({ ok: false, error: "Erro ao excluir conta de autenticação" }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[account/delete] Error:", err);
    return NextResponse.json({ ok: false, error: "Erro interno" }, { status: 500 });
  }
}
