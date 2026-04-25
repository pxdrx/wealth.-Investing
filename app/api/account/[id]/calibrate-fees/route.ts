// Calibrates per-contract round-turn fees from the user's broker statement.
//
// The user pastes the actual balance their broker shows. We back-solve the
// fee/contract that, when applied retroactively across every imported trade
// in this account, makes the dashboard balance match. The fee is then saved
// on accounts.fee_per_contract_round_turn so subsequent imports of the same
// account apply it automatically.

import { NextRequest, NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createSupabaseClientForUser } from "@/lib/supabase/server";

export const runtime = "nodejs";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const FEE_LESS_SOURCES = ["csv_tradovate", "csv_generic"];

/**
 * Resolves the effective starting balance for an account.
 *
 * For prop-firm accounts the starting balance lives on `prop_accounts.starting_balance_usd`,
 * not on the parent `accounts` row — which is left as NULL by the AddAccountModal flow
 * (see components/account/AddAccountModal.tsx:316). The fee-calibration math depends on
 * this value, so falling back blindly to 0 breaks the entire calibration: target -
 * starting - grossPnl ends up being a target like $100,682 instead of an offset like
 * $-235, and the back-solved fee/contract comes out three orders of magnitude wrong.
 *
 * Order: account.starting_balance_usd → prop_accounts.starting_balance_usd → null.
 */
async function resolveStartingBalance(
  supabase: SupabaseClient,
  accountId: string
): Promise<{ startingBalance: number; source: "accounts" | "prop_accounts" | "missing" }> {
  const { data: acc } = await supabase
    .from("accounts")
    .select("starting_balance_usd")
    .eq("id", accountId)
    .maybeSingle();
  const accVal = (acc as { starting_balance_usd?: number | null } | null)?.starting_balance_usd;
  if (typeof accVal === "number" && accVal > 0) {
    return { startingBalance: accVal, source: "accounts" };
  }
  // Fallback to prop_accounts (where AddAccountModal stores starting_balance_usd
  // for prop-firm accounts).
  const { data: prop } = await supabase
    .from("prop_accounts")
    .select("starting_balance_usd")
    .eq("account_id", accountId)
    .maybeSingle();
  const propVal = (prop as { starting_balance_usd?: number | null } | null)?.starting_balance_usd;
  if (typeof propVal === "number" && propVal > 0) {
    return { startingBalance: propVal, source: "prop_accounts" };
  }
  return { startingBalance: 0, source: "missing" };
}

/** Aggregates the inputs the calibration math depends on, so the UI can show
 *  a pre-flight summary ("starting $100k, gross PnL $917, 24 trades, 228
 *  contracts → tell me the broker balance"). Helps the user catch obvious
 *  data issues (duplicates, wrong account selected) before calibrating. */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const accountId = params.id;
  if (!accountId || !UUID_RE.test(accountId)) {
    return NextResponse.json(
      { ok: false, error: "Invalid account id" },
      { status: 400 }
    );
  }
  const auth = req.headers.get("authorization");
  const token = auth?.startsWith("Bearer ") ? auth.slice(7) : null;
  if (!token) {
    return NextResponse.json(
      { ok: false, error: "Missing bearer token" },
      { status: 401 }
    );
  }
  const supabase = createSupabaseClientForUser(token);
  const { data: account } = await supabase
    .from("accounts")
    .select("id, fee_per_contract_round_turn, name")
    .eq("id", accountId)
    .maybeSingle();
  if (!account) {
    return NextResponse.json(
      { ok: false, error: "Account not found" },
      { status: 404 }
    );
  }
  const { startingBalance, source: startingBalanceSource } =
    await resolveStartingBalance(supabase, accountId);
  const { data: rows } = await supabase
    .from("journal_trades")
    .select("pnl_usd, volume, external_source")
    .eq("account_id", accountId)
    .in("external_source", FEE_LESS_SOURCES);
  type Row = {
    pnl_usd: number | null;
    volume: number | null;
    external_source: string | null;
  };
  const list = (rows ?? []) as Row[];
  const grossPnl = list.reduce((s, t) => s + Number(t.pnl_usd ?? 0), 0);
  const totalContracts = list.reduce(
    (s, t) => s + Math.abs(Number(t.volume ?? 0)),
    0
  );
  return NextResponse.json({
    ok: true,
    account_name: (account as { name?: string }).name ?? null,
    starting_balance_usd: startingBalance,
    starting_balance_source: startingBalanceSource,
    fee_per_contract_round_turn:
      (account as { fee_per_contract_round_turn?: number | null })
        .fee_per_contract_round_turn ?? null,
    fee_less_trades: list.length,
    gross_pnl_usd: grossPnl,
    total_contracts: totalContracts,
    current_balance_estimate_usd: startingBalance + grossPnl, // gross, no fees
  });
}

/** Wipes the calibration: clears fees_usd on every fee-less trade and the
 *  saved fee on the account. Lets the user retry calibration without
 *  re-importing. */
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const accountId = params.id;
  if (!accountId || !UUID_RE.test(accountId)) {
    return NextResponse.json(
      { ok: false, error: "Invalid account id" },
      { status: 400 }
    );
  }
  const auth = req.headers.get("authorization");
  const token = auth?.startsWith("Bearer ") ? auth.slice(7) : null;
  if (!token) {
    return NextResponse.json(
      { ok: false, error: "Missing bearer token" },
      { status: 401 }
    );
  }
  const supabase = createSupabaseClientForUser(token);

  // Reset fees_usd to 0 (and net_pnl_usd to pnl_usd) on every fee-less trade.
  const { data: rows } = await supabase
    .from("journal_trades")
    .select("id, pnl_usd")
    .eq("account_id", accountId)
    .in("external_source", FEE_LESS_SOURCES);
  type Row = { id: string; pnl_usd: number | null };
  const list = (rows ?? []) as Row[];
  let netPnlGeneratedColumn = false;
  for (const t of list) {
    const pnl = Number(t.pnl_usd ?? 0);
    const { error } = await supabase
      .from("journal_trades")
      .update(
        netPnlGeneratedColumn
          ? { fees_usd: 0 }
          : { fees_usd: 0, net_pnl_usd: pnl }
      )
      .eq("id", t.id);
    if (error && (error.code === "428C9" || error.code === "42703") && !netPnlGeneratedColumn) {
      netPnlGeneratedColumn = true;
      // retry without net_pnl_usd
      await supabase
        .from("journal_trades")
        .update({ fees_usd: 0 })
        .eq("id", t.id);
    }
  }
  await supabase
    .from("accounts")
    .update({ fee_per_contract_round_turn: null })
    .eq("id", accountId);

  return NextResponse.json({
    ok: true,
    trades_reset: list.length,
  });
}

interface CalibrateBody {
  /** Real balance the broker reports (not the lucro — the full balance). */
  actual_balance_usd?: number;
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const accountId = params.id;
  if (!accountId || !UUID_RE.test(accountId)) {
    return NextResponse.json(
      { ok: false, error: "Invalid account id" },
      { status: 400 }
    );
  }

  const auth = req.headers.get("authorization");
  const token = auth?.startsWith("Bearer ") ? auth.slice(7) : null;
  if (!token) {
    return NextResponse.json(
      { ok: false, error: "Missing bearer token" },
      { status: 401 }
    );
  }

  let body: CalibrateBody = {};
  try {
    body = (await req.json()) as CalibrateBody;
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid JSON body" },
      { status: 400 }
    );
  }
  const target =
    typeof body.actual_balance_usd === "number" &&
    Number.isFinite(body.actual_balance_usd)
      ? body.actual_balance_usd
      : NaN;
  if (!Number.isFinite(target)) {
    return NextResponse.json(
      { ok: false, error: "actual_balance_usd must be a finite number" },
      { status: 400 }
    );
  }

  const supabase = createSupabaseClientForUser(token);

  // Owner check.
  const { data: account, error: accErr } = await supabase
    .from("accounts")
    .select("id, user_id")
    .eq("id", accountId)
    .maybeSingle();
  if (accErr) {
    return NextResponse.json(
      { ok: false, error: accErr.message },
      { status: 500 }
    );
  }
  if (!account) {
    return NextResponse.json(
      { ok: false, error: "Account not found" },
      { status: 404 }
    );
  }
  const { startingBalance, source: startingBalanceSource } =
    await resolveStartingBalance(supabase, accountId);
  if (startingBalanceSource === "missing") {
    return NextResponse.json(
      {
        ok: false,
        error:
          "Conta sem saldo inicial configurado. Defina starting_balance_usd em accounts ou prop_accounts antes de calibrar.",
      },
      { status: 422 }
    );
  }

  // Pull every futures-style trade to compute the implicit fee/contract.
  // We restrict to imports that lack a commission column (csv_tradovate,
  // csv_generic) — MT5 / NinjaTrader / cTrader CSVs already carry fees.
  const FEE_LESS_SOURCES = ["csv_tradovate", "csv_generic"];
  const { data: trades, error: tradesErr } = await supabase
    .from("journal_trades")
    .select("id, pnl_usd, fees_usd, volume, external_source")
    .eq("account_id", accountId)
    .in("external_source", FEE_LESS_SOURCES);
  if (tradesErr) {
    return NextResponse.json(
      { ok: false, error: tradesErr.message },
      { status: 500 }
    );
  }
  type TradeRow = {
    id: string;
    pnl_usd: number | null;
    fees_usd: number | null;
    volume: number | null;
    external_source: string | null;
  };
  const list: TradeRow[] = (trades ?? []) as TradeRow[];
  if (list.length === 0) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "Esta conta não tem trades importadas de fontes sem comissão (Tradovate Position History etc.). Calibração não se aplica.",
      },
      { status: 422 }
    );
  }

  const grossPnl = list.reduce((s, t) => s + Number(t.pnl_usd ?? 0), 0);
  const totalContracts = list.reduce(
    (s, t) => s + Math.abs(Number(t.volume ?? 0)),
    0
  );

  // Solve: starting + gross + estimated_fees = target
  //   estimated_fees = target - starting - gross  (negative if fees > 0)
  const estimatedFees = target - startingBalance - grossPnl;
  if (estimatedFees >= 0) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "Saldo informado é maior que o saldo bruto sem fees. Verifique o valor.",
        debug: { startingBalance, grossPnl, target, totalContracts },
      },
      { status: 422 }
    );
  }
  const feeMagnitude = -estimatedFees; // positive USD

  // Two ways to distribute the fee delta:
  //   1. Per contract (preferred): scales with size of each trade. Requires
  //      every trade to have volume populated.
  //   2. Per trade (fallback): split equally across N trades. Used when the
  //      legacy import path (pre-fix) saved trades without `volume`. Less
  //      precise but better than failing — the dashboard balance still
  //      matches after calibration.
  let feePerContract: number | null = null;
  let updates: Array<{ id: string; fees_usd: number }>;
  let mode: "per_contract" | "per_trade";

  if (totalContracts > 0) {
    feePerContract = feeMagnitude / totalContracts;
    if (feePerContract > 50) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Fee/contrato calculado é absurdamente alto (>$50/RT). Verifique se o saldo informado está correto.",
          debug: { startingBalance, grossPnl, target, totalContracts, feePerContract },
        },
        { status: 422 }
      );
    }
    updates = list.map((t) => ({
      id: t.id,
      fees_usd: -Math.abs(Number(t.volume ?? 0)) * feePerContract!,
    }));
    mode = "per_contract";
  } else {
    // Per-trade fallback: divide the fee delta uniformly across trades. This
    // matches the dashboard balance even when no volume is recorded — the
    // user still gets a correct total balance, just not size-weighted fees.
    const perTradeFee = feeMagnitude / list.length;
    updates = list.map((t) => ({ id: t.id, fees_usd: -perTradeFee }));
    mode = "per_trade";
  }
  // Build updates including net_pnl_usd. The dashboard balance reads from
  // accounts.starting_balance + sum(net_pnl_usd) (lib/student-balance.ts), so
  // updating fees_usd alone is not enough when net_pnl_usd is a stored column
  // populated by a trigger that only fires on INSERT — values stay stale.
  // Setting net_pnl_usd = pnl_usd + fees_usd explicitly here keeps the
  // dashboard in sync. If the column turns out to be GENERATED ALWAYS STORED
  // (Postgres rejects the write with code 428C9 / "cannot update generated
  // column"), we fall back to updating only fees_usd — generated columns
  // recompute themselves on UPDATE so the math still ends up right.
  const updatesWithNet = updates.map((u, i) => ({
    id: u.id,
    fees_usd: u.fees_usd,
    net_pnl_usd: Number(list[i].pnl_usd ?? 0) + u.fees_usd,
  }));

  // Supabase has no batch UPDATE WITH per-row values via the client, so we
  // run individual updates in parallel chunks. For typical futures accounts
  // (< 500 trades) this is fast enough.
  const CHUNK = 25;
  let netPnlGeneratedColumn = false;
  for (let i = 0; i < updatesWithNet.length; i += CHUNK) {
    const slice = updatesWithNet.slice(i, i + CHUNK);
    const promises = slice.map((u) =>
      supabase
        .from("journal_trades")
        .update(
          netPnlGeneratedColumn
            ? { fees_usd: u.fees_usd }
            : { fees_usd: u.fees_usd, net_pnl_usd: u.net_pnl_usd }
        )
        .eq("id", u.id)
    );
    const results = await Promise.all(promises);
    for (const r of results) {
      if (r.error) {
        // 428C9 = "column N can only be updated to DEFAULT" (generated stored)
        // 42703 = "column N does not exist" (very old schemas)
        // Either way, retry the whole loop without net_pnl_usd.
        if (
          !netPnlGeneratedColumn &&
          (r.error.code === "428C9" || r.error.code === "42703")
        ) {
          netPnlGeneratedColumn = true;
          console.warn(
            "[calibrate-fees] net_pnl_usd is generated/missing — falling back to fees_usd only"
          );
          // Re-run this chunk without net_pnl_usd.
          const retry = slice.map((u) =>
            supabase
              .from("journal_trades")
              .update({ fees_usd: u.fees_usd })
              .eq("id", u.id)
          );
          await Promise.all(retry);
        } else {
          console.error(
            "[calibrate-fees] update failed:",
            r.error.code,
            r.error.message
          );
        }
      }
    }
  }

  // Persist on the account so future imports auto-apply — but only when we
  // actually solved a per-contract fee. The per-trade fallback can't be
  // generalized to future imports (different trade counts), so leave the
  // account flag null and the user re-runs calibration after each import
  // until they re-import with the volume-aware path.
  const { error: saveErr } = await supabase
    .from("accounts")
    .update({
      fee_per_contract_round_turn:
        mode === "per_contract" ? feePerContract : null,
    })
    .eq("id", accountId);
  if (saveErr) {
    console.warn(
      "[calibrate-fees] account save failed:",
      saveErr.code,
      saveErr.message
    );
  }

  return NextResponse.json({
    ok: true,
    mode,
    fee_per_contract_round_turn: feePerContract,
    trades_updated: updates.length,
    total_contracts: totalContracts,
    estimated_fees_total: -feeMagnitude,
    debug: {
      starting_balance_usd: startingBalance,
      starting_balance_source: startingBalanceSource,
      gross_pnl_usd: grossPnl,
      target_balance_usd: target,
      total_trades: list.length,
    },
  });
}
