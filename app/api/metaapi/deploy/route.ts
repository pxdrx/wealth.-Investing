import { NextRequest, NextResponse } from "next/server";
import { createSupabaseClientForUser } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

/**
 * POST /api/metaapi/deploy
 * Checks the MetaAPI account connection status and updates our DB.
 * Called by the frontend in a polling loop after /connect.
 * Does NOT block — just checks and returns current status.
 */
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

  // 2. Parse body
  const body = await req.json().catch(() => ({}));
  const accountId = body.accountId as string | undefined;

  if (!accountId) {
    return NextResponse.json({ ok: false, error: "accountId obrigatório" }, { status: 400 });
  }

  // 3. Find connection
  const { data: conn, error: connErr } = await supabase
    .from("metaapi_connections")
    .select("id, metaapi_account_id, connection_status")
    .eq("account_id", accountId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (connErr || !conn) {
    return NextResponse.json({ ok: false, error: "Conexão não encontrada" }, { status: 404 });
  }

  if (conn.connection_status === "connected") {
    return NextResponse.json({ ok: true, data: { connectionStatus: "connected" } });
  }

  // 4. Check MetaAPI status via REST (no SDK blocking)
  try {
    const { default: MetaApi } = await import("metaapi.cloud-sdk/node");
    const metaApiToken = process.env.METAAPI_TOKEN;
    if (!metaApiToken) throw new Error("METAAPI_TOKEN not configured");

    const api = new MetaApi(metaApiToken);
    const account = await api.metatraderAccountApi.getAccount(conn.metaapi_account_id);

    const state = account.state;
    const connStatus = account.connectionStatus;

    // If not deployed yet, trigger deploy (non-blocking)
    if (state !== "DEPLOYED" && state !== "DEPLOYING") {
      try {
        await account.deploy();
      } catch {
        // Already deploying or other issue — will retry on next poll
      }
      return NextResponse.json({
        ok: true,
        data: { connectionStatus: "connecting", metaApiState: state },
      });
    }

    // If deploying, wait
    if (state === "DEPLOYING") {
      return NextResponse.json({
        ok: true,
        data: { connectionStatus: "connecting", metaApiState: "DEPLOYING" },
      });
    }

    // Deployed — check broker connection
    if (connStatus === "CONNECTED") {
      // Try to get account info
      let equity: number | null = null;
      let balance: number | null = null;

      try {
        const connection = account.getRPCConnection();
        await connection.connect();
        await connection.waitSynchronized();
        const info = await connection.getAccountInformation();
        equity = info.equity;
        balance = info.balance;
      } catch {
        // Will get data on next poll
      }

      // Update DB to connected
      await supabase
        .from("metaapi_connections")
        .update({
          connection_status: "connected",
          last_sync_at: new Date().toISOString(),
          last_error: null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", conn.id);

      // Save initial snapshot
      if (equity !== null && balance !== null) {
        await supabase.from("live_equity_snapshots").insert({
          connection_id: conn.id,
          user_id: user.id,
          account_id: accountId,
          equity,
          balance,
          open_positions_count: 0,
          unrealized_pnl: 0,
          daily_pnl: 0,
          daily_dd_pct: 0,
          overall_dd_pct: 0,
        });
      }

      return NextResponse.json({
        ok: true,
        data: { connectionStatus: "connected", equity, balance },
      });
    }

    // Deployed but not connected to broker yet
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
    console.error("[metaapi/deploy] Error:", msg);

    // Don't mark as error on transient failures — let the poll retry
    return NextResponse.json({
      ok: true,
      data: { connectionStatus: "connecting", error: msg },
    });
  }
}
