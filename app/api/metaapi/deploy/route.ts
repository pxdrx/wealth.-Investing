import { NextRequest, NextResponse } from "next/server";
import { createSupabaseClientForUser } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const maxDuration = 15;

/**
 * POST /api/metaapi/deploy
 * Lightweight status check via MetaAPI REST API.
 * Returns immediately with ACTUAL MetaAPI state.
 */
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
    return NextResponse.json({
      ok: true,
      data: { connectionStatus: "error", error: "METAAPI_TOKEN não configurado no servidor" },
    });
  }

  try {
    // Fetch account status via REST API
    const apiRes = await fetch(
      `https://mt-provisioning-api-v1.agiliumtrade.agiliumtrade.ai/users/current/accounts/${conn.metaapi_account_id}`,
      { headers: { "auth-token": metaApiToken } }
    );

    if (!apiRes.ok) {
      const errBody = await apiRes.text().catch(() => "");
      return NextResponse.json({
        ok: true,
        data: {
          connectionStatus: "error",
          error: `MetaAPI retornou ${apiRes.status}: ${errBody.slice(0, 200)}`,
        },
      });
    }

    const acc = await apiRes.json();
    const state: string = acc.state || "UNKNOWN";
    const brokerConn: string = acc.connectionStatus || "UNKNOWN";

    // Calculate how long we've been trying
    const ageMinutes = (Date.now() - new Date(conn.created_at).getTime()) / 60_000;

    // ── DEPLOYED + CONNECTED → Success ──
    if (state === "DEPLOYED" && brokerConn === "CONNECTED") {
      await supabase
        .from("metaapi_connections")
        .update({
          connection_status: "connected",
          last_sync_at: new Date().toISOString(),
          last_error: null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", conn.id);

      return NextResponse.json({
        ok: true,
        data: { connectionStatus: "connected" },
      });
    }

    // ── DEPLOYED + DISCONNECTED → Broker can't connect ──
    if (state === "DEPLOYED" && (brokerConn === "DISCONNECTED" || brokerConn === "DISCONNECTED_FROM_BROKER")) {
      // Give it 2 minutes to connect, then error
      if (ageMinutes > 2) {
        await supabase
          .from("metaapi_connections")
          .update({
            connection_status: "error",
            last_error: `Broker desconectado (${brokerConn}). Verifique login, servidor e senha investor.`,
            updated_at: new Date().toISOString(),
          })
          .eq("id", conn.id);

        return NextResponse.json({
          ok: true,
          data: {
            connectionStatus: "error",
            error: "Não foi possível conectar ao broker. Verifique se o login, servidor e senha investor estão corretos. O servidor deve ser exatamente como aparece no MT5 (ex: FTMO-Server3, não FTMO-Server).",
          },
        });
      }
    }

    // ── Not deployed yet → trigger deploy ──
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

    // ── General timeout → error after 5 minutes ──
    if (ageMinutes > 5) {
      await supabase
        .from("metaapi_connections")
        .update({
          connection_status: "error",
          last_error: `Timeout: state=${state}, broker=${brokerConn}`,
          updated_at: new Date().toISOString(),
        })
        .eq("id", conn.id);

      return NextResponse.json({
        ok: true,
        data: {
          connectionStatus: "error",
          error: `Timeout ao conectar. Estado: ${state}, Broker: ${brokerConn}. Tente desconectar e reconectar.`,
        },
      });
    }

    // ── Still in progress ──
    return NextResponse.json({
      ok: true,
      data: { connectionStatus: "connecting", metaApiState: state, brokerConnection: brokerConn },
    });
  } catch (err) {
    const msg = (err as Error).message || String(err);
    return NextResponse.json({
      ok: true,
      data: { connectionStatus: "error", error: `Erro interno: ${msg}` },
    });
  }
}
