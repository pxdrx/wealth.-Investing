import { NextRequest, NextResponse } from "next/server";
import { createSupabaseClientForUser } from "@/lib/supabase/server";
import { provisionAccount, deployAccount } from "@/lib/metaapi/client";
import { encryptPassword } from "@/lib/metaapi/crypto";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function POST(req: NextRequest) {
  // 1. Auth
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json({ ok: false, error: "Não autorizado" }, { status: 401 });
  }

  const token = authHeader.replace("Bearer ", "");
  const supabase = createSupabaseClientForUser(token);
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) {
    return NextResponse.json({ ok: false, error: "Token inválido" }, { status: 401 });
  }

  // 2. Check Ultra tier
  const { data: sub } = await supabase
    .from("subscriptions")
    .select("plan")
    .eq("user_id", user.id)
    .eq("status", "active")
    .maybeSingle();

  if (!sub || sub.plan !== "ultra") {
    return NextResponse.json({ ok: false, error: "Live monitoring é exclusivo do plano Ultra." }, { status: 403 });
  }

  // 3. Parse body
  const body = await req.json().catch(() => ({}));
  const { accountId, brokerLogin, brokerServer, investorPassword, platform } = body as {
    accountId?: string;
    brokerLogin?: string;
    brokerServer?: string;
    investorPassword?: string;
    platform?: "mt4" | "mt5";
  };

  if (!accountId || !brokerLogin || !brokerServer || !investorPassword) {
    return NextResponse.json({ ok: false, error: "Campos obrigatórios: accountId, brokerLogin, brokerServer, investorPassword" }, { status: 400 });
  }

  // 4. Validate prop account
  const { data: account } = await supabase
    .from("accounts")
    .select("id, name, kind")
    .eq("id", accountId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!account) {
    return NextResponse.json({ ok: false, error: "Conta não encontrada" }, { status: 404 });
  }
  if (account.kind !== "prop") {
    return NextResponse.json({ ok: false, error: "Disponível apenas para contas prop" }, { status: 400 });
  }

  // 5. Handle existing connections
  const { data: existingConns } = await supabase
    .from("metaapi_connections")
    .select("id, account_id, connection_status, created_at")
    .eq("user_id", user.id);

  if (existingConns && existingConns.length > 0) {
    for (const ec of existingConns) {
      // Auto-cleanup stuck connections >5 min
      if (ec.connection_status === "connecting" || ec.connection_status === "error") {
        const ageMin = (Date.now() - new Date(ec.created_at).getTime()) / 60_000;
        if (ageMin > 5) {
          await supabase.from("live_alert_configs").delete().eq("account_id", ec.account_id).eq("user_id", user.id);
          await supabase.from("metaapi_connections").delete().eq("id", ec.id);
          continue;
        }
      }
      // Same account — return existing
      if (ec.account_id === accountId) {
        return NextResponse.json({ ok: true, data: { connectionStatus: ec.connection_status, existing: true } });
      }
      // Different account — block
      return NextResponse.json({ ok: false, error: "Desconecte a outra conta antes." }, { status: 409 });
    }
  }

  // 6. Create account via MetaAPI REST API
  try {
    const provision = await provisionAccount(
      brokerLogin,
      investorPassword,
      brokerServer,
      `wi-${account.name}-${user.id.slice(0, 8)}`,
      platform ?? "mt5"
    );

    // 7. Trigger deploy (non-blocking)
    await deployAccount(provision.metaApiAccountId).catch((e) => {
      console.warn("[connect] Deploy trigger error (non-critical):", (e as Error).message);
    });

    // 8. Save to DB
    const encryptedPw = encryptPassword(investorPassword);
    const { error: insertErr } = await supabase.from("metaapi_connections").insert({
      user_id: user.id,
      account_id: accountId,
      metaapi_account_id: provision.metaApiAccountId,
      broker_login: brokerLogin,
      broker_server: brokerServer,
      encrypted_investor_password: encryptedPw,
      connection_status: "connecting",
    });

    if (insertErr) {
      return NextResponse.json({ ok: false, error: `DB error: ${insertErr.message}` }, { status: 500 });
    }

    // 9. Default alert configs
    await supabase.from("live_alert_configs").insert([
      { user_id: user.id, account_id: accountId, alert_type: "daily_dd", warning_threshold_pct: 4.0, critical_threshold_pct: 4.5, is_active: true },
      { user_id: user.id, account_id: accountId, alert_type: "overall_dd", warning_threshold_pct: 8.0, critical_threshold_pct: 9.0, is_active: true },
    ]);

    return NextResponse.json({ ok: true, data: { connectionStatus: "connecting", metaApiAccountId: provision.metaApiAccountId } });
  } catch (err) {
    const msg = (err as Error).message || String(err);
    console.error("[connect] Error:", msg);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
