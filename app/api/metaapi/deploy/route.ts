import { NextRequest, NextResponse } from "next/server";
import { createSupabaseClientForUser } from "@/lib/supabase/server";
import { deployAndWait, getAccountInfo, getConnectionStatus } from "@/lib/metaapi/client";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * POST /api/metaapi/deploy
 * Attempts to deploy and check the connection status of a MetaAPI account.
 * Called by the frontend in a polling loop after /connect returns "connecting".
 * Returns the current status — frontend keeps polling until "connected" or "error".
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

  // Already connected — return immediately
  if (conn.connection_status === "connected") {
    return NextResponse.json({
      ok: true,
      data: { connectionStatus: "connected" },
    });
  }

  // 4. Try to deploy and check status
  try {
    // Check current MetaAPI status first
    const status = await getConnectionStatus(conn.metaapi_account_id);

    if (status.state !== "DEPLOYED") {
      // Trigger deploy (non-blocking if already deploying)
      try {
        await deployAndWait(conn.metaapi_account_id);
      } catch {
        // deployAndWait may timeout within our 60s limit — that's OK, we'll retry
        const retryStatus = await getConnectionStatus(conn.metaapi_account_id);
        if (retryStatus.state !== "DEPLOYED" || retryStatus.connectionStatus !== "CONNECTED") {
          return NextResponse.json({
            ok: true,
            data: { connectionStatus: "connecting", metaApiState: retryStatus.state },
          });
        }
      }
    }

    // If deployed, check if connected to broker
    const finalStatus = await getConnectionStatus(conn.metaapi_account_id);

    if (finalStatus.connectionStatus === "CONNECTED") {
      // Get first equity reading
      let equity: number | null = null;
      let balance: number | null = null;
      try {
        const info = await getAccountInfo(conn.metaapi_account_id);
        equity = info.equity;
        balance = info.balance;
      } catch {
        // Non-critical — we'll get it on the next poll
      }

      // Update status to connected
      await supabase
        .from("metaapi_connections")
        .update({
          connection_status: "connected",
          last_sync_at: new Date().toISOString(),
          last_error: null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", conn.id);

      // Save initial snapshot if we got equity
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
        data: {
          connectionStatus: "connected",
          equity,
          balance,
        },
      });
    }

    // Still deploying/connecting
    return NextResponse.json({
      ok: true,
      data: {
        connectionStatus: "connecting",
        metaApiState: finalStatus.state,
        brokerConnection: finalStatus.connectionStatus,
      },
    });
  } catch (err) {
    const msg = (err as Error).message || String(err);
    console.error("[metaapi/deploy] Error:", msg);

    // Update connection with error
    await supabase
      .from("metaapi_connections")
      .update({
        connection_status: "error",
        last_error: msg.slice(0, 500),
        updated_at: new Date().toISOString(),
      })
      .eq("id", conn.id);

    return NextResponse.json({
      ok: true,
      data: { connectionStatus: "error", error: msg },
    });
  }
}
