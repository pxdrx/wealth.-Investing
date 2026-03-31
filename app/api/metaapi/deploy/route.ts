import { NextRequest, NextResponse } from "next/server";
import { createSupabaseClientForUser } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const maxDuration = 15;

export async function POST(req: NextRequest) {
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

  const body = await req.json().catch(() => ({}));
  const accountId = body.accountId as string | undefined;
  if (!accountId) {
    return NextResponse.json({ ok: false, error: "accountId obrigatório" }, { status: 400 });
  }

  const { data: conn } = await supabase
    .from("metaapi_connections")
    .select("id, metaapi_account_id, connection_status, created_at")
    .eq("account_id", accountId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!conn) {
    return NextResponse.json({ ok: false, error: "Conexão não encontrada" }, { status: 404 });
  }

  if (conn.connection_status === "connected") {
    return NextResponse.json({ ok: true, data: { connectionStatus: "connected" } });
  }

  const metaApiToken = process.env.METAAPI_TOKEN;
  if (!metaApiToken) {
    await markError(supabase, conn.id, "METAAPI_TOKEN não configurado");
    return NextResponse.json({ ok: false, error: "METAAPI_TOKEN não configurado no servidor" }, { status: 500 });
  }

  const ageMinutes = (Date.now() - new Date(conn.created_at).getTime()) / 60_000;

  // Global timeout: 3 minutes max
  if (ageMinutes > 3) {
    try {
      const apiUrl = `https://mt-provisioning-api-v1.agiliumtrade.agiliumtrade.ai/users/current/accounts/${conn.metaapi_account_id}`;
      const apiRes = await fetch(apiUrl, { headers: { "auth-token": metaApiToken } });
      const rawBody = await apiRes.text();
      let state = "UNKNOWN";
      let brokerConn = "UNKNOWN";
      try {
        const acc = JSON.parse(rawBody);
        state = acc.state || "UNKNOWN";
        brokerConn = acc.connectionStatus || "UNKNOWN";
      } catch { /* ignore parse error */ }

      // One last check: maybe it just connected
      if (state === "DEPLOYED" && brokerConn === "CONNECTED") {
        await supabase
          .from("metaapi_connections")
          .update({ connection_status: "connected", last_sync_at: new Date().toISOString(), last_error: null, updated_at: new Date().toISOString() })
          .eq("id", conn.id);
        return NextResponse.json({ ok: true, data: { connectionStatus: "connected" } });
      }

      const errorMsg = `Timeout após ${Math.floor(ageMinutes)}min. Estado: ${state}, Broker: ${brokerConn}. Verifique login, servidor e senha investor.`;
      await markError(supabase, conn.id, errorMsg);
      return NextResponse.json({ ok: false, error: errorMsg });
    } catch (err) {
      const errorMsg = `Timeout após ${Math.floor(ageMinutes)}min: ${(err as Error).message}`;
      await markError(supabase, conn.id, errorMsg);
      return NextResponse.json({ ok: false, error: errorMsg });
    }
  }

  try {
    const apiUrl = `https://mt-provisioning-api-v1.agiliumtrade.agiliumtrade.ai/users/current/accounts/${conn.metaapi_account_id}`;
    const apiRes = await fetch(apiUrl, {
      headers: { "auth-token": metaApiToken },
    });

    const rawBody = await apiRes.text();

    if (!apiRes.ok) {
      // MetaAPI returned an error — propagate immediately
      const errorMsg = `MetaAPI erro ${apiRes.status}: ${rawBody.slice(0, 200)}`;
      // For 4xx errors (bad credentials, not found), fail immediately
      if (apiRes.status >= 400 && apiRes.status < 500) {
        await markError(supabase, conn.id, errorMsg);
        return NextResponse.json({ ok: false, error: errorMsg });
      }
      // For 5xx, allow retry if young enough
      return NextResponse.json({
        ok: true,
        data: { connectionStatus: "connecting", debug: `API ${apiRes.status} (retrying...)` },
      });
    }

    let acc: Record<string, unknown>;
    try {
      acc = JSON.parse(rawBody);
    } catch {
      await markError(supabase, conn.id, `Resposta inválida do MetaAPI: ${rawBody.slice(0, 200)}`);
      return NextResponse.json({ ok: false, error: `Resposta inválida do MetaAPI` });
    }

    const state = (acc.state as string) || "UNKNOWN";
    const brokerConn = (acc.connectionStatus as string) || "UNKNOWN";

    // ── SUCCESS: DEPLOYED + CONNECTED ──
    if (state === "DEPLOYED" && brokerConn === "CONNECTED") {
      await supabase
        .from("metaapi_connections")
        .update({ connection_status: "connected", last_sync_at: new Date().toISOString(), last_error: null, updated_at: new Date().toISOString() })
        .eq("id", conn.id);
      return NextResponse.json({ ok: true, data: { connectionStatus: "connected" } });
    }

    // ── NOT DEPLOYED: trigger deploy ──
    if (state === "CREATED" || state === "UNDEPLOYED") {
      await fetch(
        `https://mt-provisioning-api-v1.agiliumtrade.agiliumtrade.ai/users/current/accounts/${conn.metaapi_account_id}/deploy`,
        { method: "POST", headers: { "auth-token": metaApiToken } }
      ).catch(() => {});
      return NextResponse.json({
        ok: true,
        data: { connectionStatus: "connecting", metaApiState: state, brokerConnection: brokerConn },
      });
    }

    // ── DEPLOYING: timeout at 2 min ──
    if (state === "DEPLOYING") {
      if (ageMinutes > 2) {
        const errorMsg = `Terminal cloud preso em DEPLOYING por ${Math.floor(ageMinutes)}min. Tente novamente.`;
        await markError(supabase, conn.id, errorMsg);
        return NextResponse.json({ ok: false, error: errorMsg });
      }
      return NextResponse.json({
        ok: true,
        data: { connectionStatus: "connecting", metaApiState: "DEPLOYING", brokerConnection: brokerConn },
      });
    }

    // ── DEPLOYED but DISCONNECTED: timeout at 90s ──
    if (state === "DEPLOYED" && brokerConn !== "CONNECTED") {
      if (ageMinutes > 1.5) {
        const errorMsg = `O terminal cloud está ativo mas não conseguiu conectar ao broker (status: ${brokerConn}). Verifique: login, servidor e senha investor.`;
        await markError(supabase, conn.id, errorMsg);
        return NextResponse.json({ ok: false, error: errorMsg });
      }
      return NextResponse.json({
        ok: true,
        data: { connectionStatus: "connecting", metaApiState: state, brokerConnection: brokerConn },
      });
    }

    // ── Other unknown states ──
    return NextResponse.json({
      ok: true,
      data: { connectionStatus: "connecting", metaApiState: state, brokerConnection: brokerConn },
    });
  } catch (err) {
    const msg = (err as Error).message || String(err);
    // Network errors — allow retry if young
    if (ageMinutes > 2) {
      await markError(supabase, conn.id, msg);
      return NextResponse.json({ ok: false, error: msg });
    }
    return NextResponse.json({
      ok: true,
      data: { connectionStatus: "connecting", debug: msg },
    });
  }
}

async function markError(supabase: ReturnType<typeof createSupabaseClientForUser>, connId: string, error: string) {
  await supabase
    .from("metaapi_connections")
    .update({ connection_status: "error", last_error: error.slice(0, 500), updated_at: new Date().toISOString() })
    .eq("id", connId);
}
