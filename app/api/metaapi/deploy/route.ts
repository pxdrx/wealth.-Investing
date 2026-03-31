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
    return NextResponse.json({ ok: true, data: { connectionStatus: "error", error: "METAAPI_TOKEN não configurado" } });
  }

  const ageMinutes = (Date.now() - new Date(conn.created_at).getTime()) / 60_000;

  try {
    // Use MetaAPI Provisioning API to check account state
    const apiUrl = `https://mt-provisioning-api-v1.agiliumtrade.agiliumtrade.ai/users/current/accounts/${conn.metaapi_account_id}`;
    const apiRes = await fetch(apiUrl, {
      headers: { "auth-token": metaApiToken },
    });

    const rawBody = await apiRes.text();

    if (!apiRes.ok) {
      // Return the raw error so we can debug
      if (ageMinutes > 3) {
        await markError(supabase, conn.id, `MetaAPI ${apiRes.status}: ${rawBody.slice(0, 200)}`);
        return NextResponse.json({
          ok: true,
          data: { connectionStatus: "error", error: `MetaAPI erro ${apiRes.status}: ${rawBody.slice(0, 200)}` },
        });
      }
      return NextResponse.json({
        ok: true,
        data: { connectionStatus: "connecting", debug: `API ${apiRes.status}: ${rawBody.slice(0, 100)}` },
      });
    }

    let acc: any;
    try {
      acc = JSON.parse(rawBody);
    } catch {
      return NextResponse.json({
        ok: true,
        data: { connectionStatus: "error", error: `Resposta inválida do MetaAPI: ${rawBody.slice(0, 200)}` },
      });
    }

    const state: string = acc.state || "UNKNOWN";
    const brokerConn: string = acc.connectionStatus || "UNKNOWN";

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

    // ── DEPLOYED but DISCONNECTED ──
    if (state === "DEPLOYED" && brokerConn !== "CONNECTED") {
      if (ageMinutes > 2) {
        await markError(supabase, conn.id, `Broker ${brokerConn} após ${Math.floor(ageMinutes)}min`);
        return NextResponse.json({
          ok: true,
          data: {
            connectionStatus: "error",
            error: `O terminal cloud está ativo mas não conseguiu conectar ao broker (status: ${brokerConn}). Verifique: login, servidor e senha investor.`,
            metaApiState: state,
            brokerConnection: brokerConn,
          },
        });
      }
      return NextResponse.json({
        ok: true,
        data: { connectionStatus: "connecting", metaApiState: state, brokerConnection: brokerConn },
      });
    }

    // ── DEPLOYING ──
    if (state === "DEPLOYING") {
      return NextResponse.json({
        ok: true,
        data: { connectionStatus: "connecting", metaApiState: "DEPLOYING", brokerConnection: brokerConn },
      });
    }

    // ── TIMEOUT ──
    if (ageMinutes > 5) {
      await markError(supabase, conn.id, `Timeout: state=${state}, broker=${brokerConn}`);
      return NextResponse.json({
        ok: true,
        data: { connectionStatus: "error", error: `Timeout. Estado: ${state}, Broker: ${brokerConn}`, metaApiState: state, brokerConnection: brokerConn },
      });
    }

    // ── Other states ──
    return NextResponse.json({
      ok: true,
      data: { connectionStatus: "connecting", metaApiState: state, brokerConnection: brokerConn },
    });
  } catch (err) {
    const msg = (err as Error).message || String(err);
    if (ageMinutes > 3) {
      await markError(supabase, conn.id, msg);
      return NextResponse.json({ ok: true, data: { connectionStatus: "error", error: msg } });
    }
    return NextResponse.json({ ok: true, data: { connectionStatus: "connecting", debug: msg } });
  }
}

async function markError(supabase: any, connId: string, error: string) {
  await supabase
    .from("metaapi_connections")
    .update({ connection_status: "error", last_error: error.slice(0, 500), updated_at: new Date().toISOString() })
    .eq("id", connId);
}
