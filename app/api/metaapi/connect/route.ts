import { NextRequest, NextResponse } from "next/server";
import { createSupabaseClientForUser } from "@/lib/supabase/server";
import { provisionAccount, deployAndWait, getAccountInfo } from "@/lib/metaapi/client";
import { encryptPassword } from "@/lib/metaapi/crypto";

export const dynamic = "force-dynamic";
export const maxDuration = 120; // Deploy can take time

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
    return NextResponse.json(
      { ok: false, error: "Live monitoring é exclusivo do plano Ultra." },
      { status: 403 }
    );
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
    return NextResponse.json(
      { ok: false, error: "Campos obrigatórios: accountId, brokerLogin, brokerServer, investorPassword" },
      { status: 400 }
    );
  }

  // 4. Validate account belongs to user and is a prop account
  const { data: account, error: accErr } = await supabase
    .from("accounts")
    .select("id, name, kind")
    .eq("id", accountId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (accErr || !account) {
    return NextResponse.json({ ok: false, error: "Conta não encontrada" }, { status: 404 });
  }

  if (account.kind !== "prop") {
    return NextResponse.json(
      { ok: false, error: "Live monitoring disponível apenas para contas de mesa proprietária" },
      { status: 400 }
    );
  }

  // 5. Check if already connected
  const { data: existing } = await supabase
    .from("metaapi_connections")
    .select("id")
    .eq("account_id", accountId)
    .maybeSingle();

  if (existing) {
    return NextResponse.json(
      { ok: false, error: "Esta conta já está conectada ao live monitoring" },
      { status: 409 }
    );
  }

  // 6. Provision MetaAPI cloud account
  try {
    const provision = await provisionAccount(
      brokerLogin,
      investorPassword,
      brokerServer,
      `wi-${account.name}-${user.id.slice(0, 8)}`,
      platform ?? "mt5"
    );

    // 7. Deploy and wait for connection
    await deployAndWait(provision.metaApiAccountId);

    // 8. Get first equity reading
    const info = await getAccountInfo(provision.metaApiAccountId);

    // 9. Encrypt password and save connection
    const encryptedPassword = encryptPassword(investorPassword);

    const { error: insertErr } = await supabase
      .from("metaapi_connections")
      .insert({
        user_id: user.id,
        account_id: accountId,
        metaapi_account_id: provision.metaApiAccountId,
        broker_login: brokerLogin,
        broker_server: brokerServer,
        encrypted_investor_password: encryptedPassword,
        connection_status: "connected",
        last_sync_at: new Date().toISOString(),
      });

    if (insertErr) {
      console.error("[metaapi/connect] DB insert error:", insertErr);
      return NextResponse.json({ ok: false, error: "Erro ao salvar conexão" }, { status: 500 });
    }

    // 10. Create default alert configs
    const defaultAlerts = [
      { alert_type: "daily_dd", warning_threshold_pct: 4.0, critical_threshold_pct: 4.5 },
      { alert_type: "overall_dd", warning_threshold_pct: 8.0, critical_threshold_pct: 9.0 },
    ];

    for (const alert of defaultAlerts) {
      await supabase.from("live_alert_configs").insert({
        user_id: user.id,
        account_id: accountId,
        ...alert,
        is_active: true,
      });
    }

    return NextResponse.json({
      ok: true,
      data: {
        connectionStatus: "connected",
        metaApiAccountId: provision.metaApiAccountId,
        equity: info.equity,
        balance: info.balance,
        broker: info.broker,
        currency: info.currency,
        investorMode: info.investorMode,
      },
    });
  } catch (err) {
    const msg = (err as Error).message || String(err);
    console.error("[metaapi/connect] Error:", msg);

    if (msg.includes("invalid credentials") || msg.includes("Invalid account")) {
      return NextResponse.json(
        { ok: false, error: "Credenciais inválidas. Verifique login, senha investor e servidor." },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { ok: false, error: "Erro ao conectar conta. Tente novamente." },
      { status: 500 }
    );
  }
}
