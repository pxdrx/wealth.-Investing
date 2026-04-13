import { NextRequest, NextResponse } from "next/server";
import { createSupabaseClientForUser } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { isAdmin } from "@/lib/admin";

const VALID_PLANS = ["free", "pro", "ultra", "mentor"] as const;
type Plan = (typeof VALID_PLANS)[number];

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * POST /api/admin/promote
 * Manually set a user's subscription plan. Requires admin privileges.
 * Body: { userId: string, plan: "free" | "pro" | "ultra" | "mentor" }
 *
 * - If plan is "free": deletes the subscription row (user reverts to free).
 * - Otherwise: upserts a subscription with status='active'.
 * - Prevents admin from demoting themselves.
 */
export async function POST(req: NextRequest) {
  try {
    // 1. Auth
    const token = req.headers.get("authorization")?.replace("Bearer ", "");
    if (!token) {
      return NextResponse.json(
        { ok: false, error: "Não autorizado" },
        { status: 401 }
      );
    }

    const supabase = createSupabaseClientForUser(token);
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { ok: false, error: "Token inválido" },
        { status: 401 }
      );
    }

    // 2. Admin check
    const admin = await isAdmin(supabase, user.id);
    if (!admin) {
      return NextResponse.json(
        { ok: false, error: "Acesso negado — apenas administradores" },
        { status: 403 }
      );
    }

    // 3. Parse body
    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { ok: false, error: "JSON inválido" },
        { status: 400 }
      );
    }

    const { userId, plan } = body;

    // 4. Validate userId
    if (!userId || typeof userId !== "string" || !UUID_RE.test(userId)) {
      return NextResponse.json(
        { ok: false, error: "userId inválido — deve ser UUID" },
        { status: 400 }
      );
    }

    // 5. Validate plan
    if (!plan || !VALID_PLANS.includes(plan as Plan)) {
      return NextResponse.json(
        {
          ok: false,
          error: `Plano inválido — deve ser: ${VALID_PLANS.join(", ")}`,
        },
        { status: 400 }
      );
    }

    const targetPlan = plan as Plan;

    // 6. Prevent admin self-demotion
    if (userId === user.id && targetPlan === "free") {
      return NextResponse.json(
        { ok: false, error: "Você não pode rebaixar a si mesmo para free" },
        { status: 400 }
      );
    }

    // 7. Verify target user exists
    const serviceClient = createServiceRoleClient();
    const {
      data: { user: targetUser },
      error: targetErr,
    } = await serviceClient.auth.admin.getUserById(userId as string);

    if (targetErr || !targetUser) {
      return NextResponse.json(
        { ok: false, error: "Usuário alvo não encontrado" },
        { status: 404 }
      );
    }

    // 8. Apply plan change using service_role (bypasses RLS)
    if (targetPlan === "free") {
      // Delete subscription row — user reverts to free tier
      const { error: delErr } = await serviceClient
        .from("subscriptions")
        .delete()
        .eq("user_id", userId);

      if (delErr) {
        console.error("[admin/promote] delete subscription error:", delErr.message);
        return NextResponse.json(
          { ok: false, error: "Erro ao remover assinatura" },
          { status: 500 }
        );
      }
    } else {
      // Upsert subscription with the new plan
      const { error: upsertErr } = await serviceClient
        .from("subscriptions")
        .upsert(
          {
            user_id: userId,
            plan: targetPlan,
            status: "active",
            billing_interval: "manual",
            stripe_customer_id: "admin_manual",
            stripe_subscription_id: `admin_${Date.now()}`,
            current_period_end: new Date(
              Date.now() + 365 * 24 * 60 * 60 * 1000
            ).toISOString(),
            cancel_at_period_end: false,
          },
          { onConflict: "user_id" }
        );

      if (upsertErr) {
        console.error("[admin/promote] upsert subscription error:", upsertErr.message);
        return NextResponse.json(
          { ok: false, error: "Erro ao atualizar assinatura" },
          { status: 500 }
        );
      }
    }

    console.log(
      `[admin/promote] Admin ${user.id} set user ${userId} to plan="${targetPlan}"`
    );

    return NextResponse.json({ ok: true, plan: targetPlan });
  } catch (err) {
    console.error("[admin/promote] Error:", err);
    return NextResponse.json(
      { ok: false, error: "Erro interno" },
      { status: 500 }
    );
  }
}
