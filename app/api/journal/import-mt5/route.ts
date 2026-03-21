import { NextResponse } from "next/server";
import { createSupabaseClientForUser } from "@/lib/supabase/server";
import { parseMt5Xlsx } from "@/lib/mt5-parser";
import { parseMt5Html } from "@/lib/mt5-html-parser";
import { inferCategory } from "@/lib/trading/category";
import { validateAccountOwnership } from "@/lib/account-validation";

export const runtime = "nodejs";
export const maxDuration = 300;

interface SkippedDetail {
  line: number;
  reason: string;
  data: string;
}

interface DuplicateDetail {
  symbol: string;
  direction: string;
  date: string;
}

const MAX_UPLOAD_BYTES = 10 * 1024 * 1024; // 10MB

export async function POST(request: Request) {
  const start = Date.now();
  const url = new URL(request.url);
  const isPreview = url.searchParams.get("preview") === "true";

  // H2: Reject oversized uploads before processing
  const contentLength = request.headers.get("content-length");
  if (contentLength && parseInt(contentLength, 10) > MAX_UPLOAD_BYTES) {
    return NextResponse.json(
      { ok: false, error: "File too large. Maximum size is 10MB." },
      { status: 413 }
    );
  }

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

    // Early ownership check — validate before expensive file parsing
    const ownedAccount = await validateAccountOwnership(supabase, accountId, userId);
    if (!ownedAccount) {
      return NextResponse.json({ error: "Account not found" }, { status: 403 });
    }

    // Detect format from file extension
    const fileName = (file.name ?? "").toLowerCase();
    const isCsv = /\.csv$/i.test(fileName);
    const isHtml = /\.html?$/i.test(fileName) || (file.type && file.type.toLowerCase().includes("html"));
    const isXlsx = /\.xlsx?$/i.test(fileName);

    if (!isCsv && !isHtml && !isXlsx) {
      return NextResponse.json({ ok: false, error: "Formato não suportado" }, { status: 400 });
    }

    let parserChosen: string;
    if (isCsv) {
      parserChosen = "ctrader_csv";
    } else if (isHtml) {
      parserChosen = "html";
    } else {
      parserChosen = "xlsx";
    }

    // Parse file
    const buffer = await file.arrayBuffer();

    let trades: Array<{ external_id: string; external_source?: string; symbol: string; direction: string; opened_at: string; closed_at: string; pnl_usd: number; fees_usd?: number; lots?: number; category?: string; commission?: number; swap?: number }>;
    let balanceOps: Array<{ type: string; amount_usd: number; at?: string | null; external_id?: string | null }>;

    try {
      if (isCsv) {
        // cTrader CSV parser — will be implemented in a later task
        try {
          const { parseCtraderCsv } = await import("@/lib/ctrader-parser");
          const result = parseCtraderCsv(Buffer.from(buffer));
          trades = result.trades.map((t) => ({
            ...t,
            fees_usd: (t.commission ?? 0) + (t.swap ?? 0),
          }));
          balanceOps = result.payouts.map((p) => ({
            type: "WITHDRAWAL",
            amount_usd: p.amount_usd,
            at: p.paid_at,
            external_id: null,
          }));
        } catch (importErr) {
          const msg = importErr instanceof Error ? importErr.message : String(importErr);
          if (msg.includes("Cannot find module") || msg.includes("Module not found")) {
            return NextResponse.json({ ok: false, error: "Parser cTrader CSV não disponível ainda" }, { status: 400 });
          }
          throw importErr;
        }
      } else {
        const result = isHtml ? parseMt5Html(buffer) : parseMt5Xlsx(buffer);
        trades = result.trades;
        balanceOps = result.balanceOps;
      }
    } catch (parseErr) {
      const msg = parseErr instanceof Error ? parseErr.message : String(parseErr);
      if (msg.startsWith("MT5 HTML parse failed")) {
        return NextResponse.json({ error: msg }, { status: 400 });
      }
      throw parseErr;
    }

    // ── PREVIEW MODE ──
    if (isPreview) {
      const sample = trades.slice(0, 5).map((t) => ({
        symbol: t.symbol,
        direction: t.direction,
        lots: (t as { lots?: number }).lots ?? 0,
        pnl: t.pnl_usd,
        date: new Date(t.closed_at).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      }));

      return NextResponse.json({
        ok: true,
        preview: true,
        trades_found: trades.length,
        payouts: balanceOps.filter((op) => op.type === "WITHDRAWAL").length,
        sample,
      });
    }

    // Account already validated in early ownership check above
    const accountName: string = ownedAccount.name ?? "";
    isPropAccount = ownedAccount.kind === "prop";

    const { data: personalRow } = await supabase
      .from("accounts")
      .select("id")
      .eq("user_id", userId)
      .eq("kind", "personal")
      .limit(1)
      .maybeSingle();
    personalAccountId = (personalRow as { id: string } | null)?.id ?? null;

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

    const sourceLabel = isCsv ? "ctrader_csv" : isHtml ? "mt5_html" : "mt5_xlsx";

    let imported = 0;
    let duplicates = 0;
    let failed = 0;
    let skippedOld = 0;
    let payoutsDetected = 0;
    let payoutsWithoutWalletDeposit = 0;
    const skippedDetails: SkippedDetail[] = [];
    const duplicateDetails: DuplicateDetail[] = [];

    // Optimization: find the latest imported trade for this account to skip old trades
    const { data: latestTrade } = await supabase
      .from("journal_trades")
      .select("closed_at")
      .eq("user_id", userId)
      .eq("account_id", accountId)
      .eq("external_source", isCsv ? "ctrader" : "mt5")
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
    // Step 1: Check for duplicates in bulk by fetching existing external_ids
    const defaultSource = isCsv ? "ctrader" : "mt5";
    const externalIds = newTrades.map((t) => t.external_id);
    const existingIdSet = new Set<string>();

    // Fetch existing external_ids in batches of 200 (Supabase .in() limit)
    const ID_CHECK_BATCH = 200;
    for (let i = 0; i < externalIds.length; i += ID_CHECK_BATCH) {
      const batch = externalIds.slice(i, i + ID_CHECK_BATCH);
      const { data: existingRows } = await supabase
        .from("journal_trades")
        .select("external_id")
        .eq("user_id", userId)
        .eq("account_id", accountId)
        .eq("external_source", defaultSource)
        .in("external_id", batch);
      if (existingRows) {
        for (const row of existingRows) {
          existingIdSet.add((row as { external_id: string }).external_id);
        }
      }
    }

    // Step 2: Separate duplicates from new inserts
    const toInsert: Array<{
      user_id: string;
      account_id: string;
      symbol: string;
      category: string;
      direction: string;
      opened_at: string;
      closed_at: string;
      pnl_usd: number;
      fees_usd: number;
      external_source: string;
      external_id: string;
    }> = [];

    for (let i = 0; i < newTrades.length; i++) {
      const t = newTrades[i];
      const tradeSource = t.external_source ?? defaultSource;

      if (existingIdSet.has(t.external_id)) {
        duplicates += 1;
        duplicateDetails.push({
          symbol: t.symbol,
          direction: t.direction,
          date: new Date(t.closed_at).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        });
        continue;
      }

      const category = t.category ?? inferCategory(t.symbol);
      toInsert.push({
        user_id: userId,
        account_id: accountId,
        symbol: t.symbol,
        category,
        direction: t.direction,
        opened_at: t.opened_at,
        closed_at: t.closed_at,
        pnl_usd: t.pnl_usd,
        fees_usd: t.fees_usd ?? 0,
        external_source: tradeSource,
        external_id: t.external_id,
      });
    }

    // Step 3: Batch insert 50 trades at a time
    const INSERT_BATCH = 50;
    for (let i = 0; i < toInsert.length; i += INSERT_BATCH) {
      const batch = toInsert.slice(i, i + INSERT_BATCH);
      const { error, data: insertedRows } = await supabase
        .from("journal_trades")
        .insert(batch)
        .select("id");

      if (error) {
        // If batch fails due to a duplicate constraint, fall back to one-by-one for this batch
        if (error.code === "23505") {
          for (let j = 0; j < batch.length; j++) {
            const row = batch[j];
            const { error: singleErr } = await supabase
              .from("journal_trades")
              .insert(row);
            if (singleErr) {
              if (singleErr.code === "23505") {
                duplicates += 1;
                duplicateDetails.push({
                  symbol: row.symbol,
                  direction: row.direction,
                  date: new Date(row.closed_at).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
                });
              } else {
                failed += 1;
                const lineNum = i + j + 1;
                skippedDetails.push({ line: lineNum, reason: singleErr.message ?? "Insert error", data: row.symbol });
                console.warn("[import-mt5] trade insert error:", singleErr.message);
              }
            } else {
              imported += 1;
            }
          }
        } else {
          // Non-duplicate batch error — count all as failed
          for (let j = 0; j < batch.length; j++) {
            failed += 1;
            const lineNum = i + j + 1;
            skippedDetails.push({ line: lineNum, reason: error.message ?? "Batch insert error", data: batch[j].symbol });
          }
          console.warn("[import-mt5] batch insert error:", error.message);
        }
      } else {
        imported += (insertedRows?.length ?? batch.length);
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
            .eq("external_source", isCsv ? "ctrader" : "mt5")
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
          external_source: isCsv ? "ctrader" : "mt5",
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
      skipped_details: skippedDetails,
      duplicate_details: duplicateDetails,
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
