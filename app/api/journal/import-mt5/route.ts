import { NextResponse } from "next/server";
import { createSupabaseClientForUser } from "@/lib/supabase/server";
import { parseMt5Xlsx } from "@/lib/mt5-parser";
import { parseMt5Html } from "@/lib/mt5-html-parser";
import { inferCategory } from "@/lib/trading/category";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const start = Date.now();
  const auth = request.headers.get("Authorization");
  const token = auth?.startsWith("Bearer ") ? auth.slice(7) : null;
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let userId: string;
  let accountId: string;
  let isPropAccount: boolean;
  let personalAccountId: string | null = null;
  let firmName = "";

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const accountIdParam = formData.get("accountId") as string | null;

    if (!file) {
      return NextResponse.json({ error: "Missing file" }, { status: 400 });
    }
    if (!accountIdParam) {
      return NextResponse.json({ error: "Missing accountId" }, { status: 400 });
    }
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(accountIdParam)) {
      return NextResponse.json({ error: "Invalid accountId format" }, { status: 400 });
    }
    accountId = accountIdParam;

    const supabase = createSupabaseClientForUser(token);
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user?.id) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }
    userId = user.id;

    const { data: accountRow } = await supabase
      .from("accounts")
      .select("id, kind, name")
      .eq("id", accountId)
      .eq("user_id", userId)
      .single();
    if (!accountRow) {
      return NextResponse.json({ error: "Account not found" }, { status: 404 });
    }
    const accountName: string = (accountRow as { name?: string }).name ?? "";
    isPropAccount = (accountRow as { kind: string }).kind === "prop";

    const { data: personalRow } = await supabase
      .from("accounts")
      .select("id")
      .eq("user_id", userId)
      .eq("kind", "personal")
      .limit(1)
      .single();
    personalAccountId = (personalRow as { id: string } | null)?.id ?? null;

    // Parse file BEFORE prop_accounts validation so we can use initial deposit for auto-heal
    const buffer = await file.arrayBuffer();
    const isHtml = /\.html?$/i.test(file.name ?? "") || (file.type && file.type.toLowerCase().includes("html"));
    const parserChosen = isHtml ? "html" : "xlsx";

    let trades: Array<{ external_id: string; symbol: string; direction: string; opened_at: string; closed_at: string; pnl_usd: number; fees_usd: number; category?: string }>;
    let balanceOps: Array<{ type: string; amount_usd: number; at?: string | null; external_id?: string | null }>;
    try {
      const result = isHtml ? parseMt5Html(buffer) : parseMt5Xlsx(buffer);
      trades = result.trades;
      balanceOps = result.balanceOps;
    } catch (parseErr) {
      const msg = parseErr instanceof Error ? parseErr.message : String(parseErr);
      if (msg.startsWith("MT5 HTML parse failed")) {
        return NextResponse.json({ error: msg }, { status: 400 });
      }
      throw parseErr;
    }

    // Prop payouts use prop_accounts.id (prop_account_id), not accounts.id.
    // Auto-heals missing prop_accounts rows using data from the parsed report.
    let propAccountRowId: string | null = null;
    if (isPropAccount) {
      const { data: propRow, error: propError } = await supabase
        .from("prop_accounts")
        .select("id, firm_name")
        .eq("account_id", accountId)
        .maybeSingle();
      if (propError) {
        console.error("[import-mt5] prop_accounts error:", propError.code, propError.message);
        return NextResponse.json(
          { error: "Failed to process account metadata" },
          { status: 500 }
        );
      }

      if (propRow && propRow.id) {
        firmName = propRow.firm_name ?? "";
        propAccountRowId = propRow.id;
      } else {
        // Auto-heal: create missing prop_accounts row from report + account name
        // Non-blocking — if auto-heal fails, trades are still imported (payouts won't link)
        const initialDeposit = balanceOps.find((op) => op.type === "INITIAL_DEPOSIT");
        const startingBalance = initialDeposit?.amount_usd ?? 0;
        const inferredFirm = accountName.split(" ")[0] || "Unknown";

        console.log("[import-mt5] auto-healing missing prop_accounts for:", accountName, "firm:", inferredFirm, "balance:", startingBalance);

        const propPayload = {
          user_id: userId,
          account_id: accountId,
          firm_name: inferredFirm,
          phase: "phase_1" as const,
          starting_balance_usd: startingBalance,
          profit_target_percent: 10,
          max_daily_loss_percent: 5,
          max_overall_loss_percent: 10,
          reset_timezone: "America/New_York",
          reset_rule: "forex_close",
        };

        // Try upsert first (handles race condition where row was created between select and insert)
        const { data: newPropRow, error: createErr } = await supabase
          .from("prop_accounts")
          .upsert(propPayload, { onConflict: "account_id" })
          .select("id, firm_name")
          .maybeSingle();

        if (createErr || !newPropRow) {
          // Non-blocking: log the error but continue importing trades
          console.error("[import-mt5] auto-heal prop_accounts failed (non-blocking):", createErr?.code, createErr?.message, createErr?.details, JSON.stringify(createErr?.hint ?? ""));
          console.warn("[import-mt5] continuing import without prop_accounts metadata — payouts will not be linked");
          firmName = inferredFirm;
          // propAccountRowId stays null — payout linking will be skipped
        } else {
          firmName = newPropRow.firm_name ?? inferredFirm;
          propAccountRowId = newPropRow.id;
        }
      }
    }

    if (isHtml && process.env.NODE_ENV === "development") {
      console.log("[import-mt5] diagnostic (HTML, dev): file=" + file.name);
      console.log("[import-mt5] diagnostic: trades=" + trades.length + " balanceOps=" + balanceOps.length);
      if (trades.length > 0) {
        console.log("[import-mt5] diagnostic first 3 trades:", JSON.stringify(trades.slice(0, 3).map((t) => ({ external_id: t.external_id, symbol: t.symbol, direction: t.direction, pnl_usd: t.pnl_usd }))));
      }
      if (balanceOps.length > 0) {
        console.log("[import-mt5] diagnostic first 3 balanceOps:", JSON.stringify(balanceOps.slice(0, 3).map((o) => ({ type: o.type, amount_usd: o.amount_usd, at: o.at }))));
      }
    }

    const sourceLabel = isHtml ? "mt5_html" : "mt5_xlsx";

    let imported = 0;
    let duplicates = 0;
    let failed = 0;
    let skippedOld = 0;
    let payoutsDetected = 0;
    let payoutsWithoutWalletDeposit = 0;

    // Optimization: find the latest imported trade for this account to skip old trades
    const { data: latestTrade } = await supabase
      .from("journal_trades")
      .select("closed_at")
      .eq("user_id", userId)
      .eq("account_id", accountId)
      .eq("external_source", "mt5")
      .order("closed_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const cutoffDate = latestTrade?.closed_at ? new Date(latestTrade.closed_at) : null;

    // Filter trades: skip those closed before the cutoff (already imported)
    const newTrades = cutoffDate
      ? trades.filter((t) => new Date(t.closed_at) >= cutoffDate)
      : trades;
    skippedOld = trades.length - newTrades.length;

    // Idempotent import for new trades only
    // net_pnl_usd is generated by the DB — do not send it on insert.
    for (const t of newTrades) {
      const { data: existing } = await supabase
        .from("journal_trades")
        .select("id")
        .eq("user_id", userId)
        .eq("account_id", accountId)
        .eq("external_source", "mt5")
        .eq("external_id", t.external_id)
        .maybeSingle();

      if (existing) {
        duplicates += 1;
        continue;
      }

      const category = (t as { category?: string }).category ?? inferCategory(t.symbol);
      const { error } = await supabase.from("journal_trades").insert({
        user_id: userId,
        account_id: accountId,
        symbol: t.symbol,
        category,
        direction: t.direction,
        opened_at: t.opened_at,
        closed_at: t.closed_at,
        pnl_usd: t.pnl_usd,
        fees_usd: t.fees_usd,
        external_source: "mt5",
        external_id: t.external_id,
      });

      if (error) {
        if (error.code === "23505") {
          duplicates += 1;
        } else {
          failed += 1;
          console.warn("[import-mt5] trade insert error:", error.message);
        }
      } else {
        imported += 1;
      }
    }

    // INITIAL_DEPOSIT from MT5 report is not sent to personal wallet — it's the prop firm's capital.
    for (const op of balanceOps) {
      if (op.type === "INITIAL_DEPOSIT" && isPropAccount) {
        continue;
      }
      // WITHDRAWAL on prop = payout; each payout resets the prop cycle (profit = net_pnl_usd after last paid_at).
      if (op.type === "WITHDRAWAL" && isPropAccount && propAccountRowId) {
        payoutsDetected += 1;
        const paidAt = op.at ? new Date(op.at).toISOString() : new Date().toISOString();
        const externalId = op.external_id ?? `payout-${paidAt}-${op.amount_usd}`;

        let existing = null;
        if (op.external_id) {
          const { data } = await supabase
            .from("prop_payouts")
            .select("id")
            .eq("prop_account_id", propAccountRowId)
            .eq("external_source", "mt5")
            .eq("external_id", op.external_id)
            .maybeSingle();
          existing = data;
        }
        if (!existing) {
          const { data: byDateAmount } = await supabase
            .from("prop_payouts")
            .select("id")
            .eq("prop_account_id", propAccountRowId)
            .eq("paid_at", paidAt)
            .eq("amount_usd", op.amount_usd)
            .maybeSingle();
          existing = byDateAmount;
        }
        if (existing) continue;

        await supabase.from("prop_payouts").insert({
          user_id: userId,
          prop_account_id: propAccountRowId,
          paid_at: paidAt,
          amount_usd: op.amount_usd,
          external_source: "mt5",
          external_id: externalId,
        });

        if (personalAccountId) {
          await supabase.from("wallet_transactions").insert({
            user_id: userId,
            account_id: personalAccountId,
            tx_type: "deposit",
            amount_usd: op.amount_usd,
            notes: `Payout ${firmName || "Prop"}`,
          });
        } else {
          payoutsWithoutWalletDeposit += 1;
        }
      }
    }

    const durationMs = Date.now() - start;
    const meta: Record<string, unknown> = {
      account_id: accountId,
      imported,
      duplicates,
      failed,
      payouts_detected: payoutsDetected,
    };
    if (payoutsWithoutWalletDeposit > 0) {
      meta.no_personal_account_for_wallet_deposit = payoutsWithoutWalletDeposit;
    }

    await supabase.from("ingestion_logs").insert({
      user_id: userId,
      status: "ok",
      source: sourceLabel,
      items_count: imported + duplicates + failed,
      duration_ms: durationMs,
      message: `Imported ${imported} trades, ${duplicates} duplicates, ${failed} failed, ${payoutsDetected} payouts`,
      meta,
    });

    if (process.env.NODE_ENV === "development") {
      console.log(
        "[import-mt5]",
        file.name,
        "parser=" + parserChosen,
        "imported=" + imported,
        "duplicates=" + duplicates,
        "failed=" + failed,
        "payouts=" + payoutsDetected
      );
    }

    return NextResponse.json({
      ok: true,
      parser_used: parserChosen,
      trades_found: trades.length,
      trades_skipped_old: skippedOld,
      balance_ops_found: balanceOps.length,
      trades_imported: imported,
      trades_duplicates_ignored: duplicates,
      trades_failed: failed,
      imported,
      duplicates,
      failed,
      payouts_detected: payoutsDetected,
      duration_ms: durationMs,
    });
  } catch (err) {
    const durationMs = Date.now() - start;
    console.error("[import-mt5] error:", err);
    if (token) {
      try {
        const supabase = createSupabaseClientForUser(token);
        const { data: { user } } = await supabase.auth.getUser(token);
        if (user?.id) {
          await supabase.from("ingestion_logs").insert({
            user_id: user.id,
            status: "error",
            source: "mt5_import",
            items_count: 0,
            duration_ms: durationMs,
            message: err instanceof Error ? err.message : String(err),
            meta: { error: String(err) },
          });
        }
      } catch (_) {}
    }
    const isParseError = err instanceof Error && err.message.startsWith("MT5 HTML parse failed");
    const status = isParseError ? 400 : 500;
    const errMsg = isParseError ? err.message : "Import failed";
    return NextResponse.json({ error: errMsg }, { status });
  }
}
