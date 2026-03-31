import { NextRequest, NextResponse } from "next/server";
import { createSupabaseClientForUser } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const maxDuration = 15;

/**
 * POST /api/metaapi/deploy
 * Lightweight status check via MetaAPI REST API (no SDK).
 * Returns immediately with current connection status.
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
    .select("id, metaapi_account_id, connection_status")
    .eq("account_id", accountId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!conn) {
    return NextResponse.json({ ok: false, error: "Conexão não encontrada" }, { status: 404 });
  }

  if (conn.connection_status === "connected") {
    return NextResponse.json({ ok: true, data: { connectionStatus: "connected" } });
  }

  // Check MetaAPI status via REST API directly (fast, no SDK overhead)
  const metaApiToken = process.env.METAAPI_TOKEN;
  if (!metaApiToken) {
    return NextResponse.json({ ok: true, data: { connectionStatus: "connecting", error: "METAAPI_TOKEN not set" } });
  }

  try {
    const apiRes = await fetch(
      `https://mt-provisioning-api-v1.agiliumtrade.agiliumtrade.ai/users/current/accounts/${conn.metaapi_account_id}`,
      {
        headers: {
          "auth-token": metaApiToken,
          "Content-Type": "application/json",
        },
      }
    );

    if (!apiRes.ok) {
      const errText = await apiRes.text();
      console.error("[deploy] MetaAPI REST error:", apiRes.status, errText);
      return NextResponse.json({
        ok: true,
        data: { connectionStatus: "connecting", error: `MetaAPI: ${apiRes.status}` },
      });
    }

    const accountData = await apiRes.json();
    const state = accountData.state; // CREATED, DEPLOYING, DEPLOYED, UNDEPLOYING, UNDEPLOYED, DELETING
    const connStatus = accountData.connectionStatus; // CONNECTED, DISCONNECTED, DISCONNECTED_FROM_BROKER

    console.log("[deploy] MetaAPI state:", state, "connectionStatus:", connStatus);

    // If not deployed, trigger deploy
    if (state === "CREATED" || state === "UNDEPLOYED") {
      await fetch(
        `https://mt-provisioning-api-v1.agiliumtrade.agiliumtrade.ai/users/current/accounts/${conn.metaapi_account_id}/deploy`,
        {
          method: "POST",
          headers: { "auth-token": metaApiToken },
        }
      );
      return NextResponse.json({
        ok: true,
        data: { connectionStatus: "connecting", metaApiState: state },
      });
    }

    // Still deploying
    if (state === "DEPLOYING") {
      return NextResponse.json({
        ok: true,
        data: { connectionStatus: "connecting", metaApiState: "DEPLOYING" },
      });
    }

    // Deployed + connected to broker = success
    if (state === "DEPLOYED" && connStatus === "CONNECTED") {
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

    // Deployed but not yet connected to broker
    return NextResponse.json({
      ok: true,
      data: {
        connectionStatus: "connecting",
        metaApiState: state,
        brokerConnection: connStatus,
      },
    });
  } catch (err) {
    const msg = (err as Error).message || String(err);
    console.error("[deploy] Error:", msg);
    return NextResponse.json({
      ok: true,
      data: { connectionStatus: "connecting", error: msg },
    });
  }
}
