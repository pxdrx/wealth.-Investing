"use client";

import { useEffect, useMemo, useState } from "react";
import { usePrivacy } from "@/components/context/PrivacyContext";
import { toForexMonthParts } from "@/lib/trading/forex-day";
import { cn } from "@/lib/utils";

type MetricMode = "pnl" | "pct_geral" | "saldo_atual";

interface Trade {
  net_pnl_usd: number | null;
  opened_at: string | null;
  closed_at?: string | null;
  account_id?: string | null;
}

interface MonthlyPerformanceGridProps {
  trades: Trade[];
  activeAccountId: string | null;
  startingBalance: number | null;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const BASE_METRICS: { key: MetricMode; label: string }[] = [
  { key: "pnl", label: "PNL" },
];

const BALANCE_METRICS: { key: MetricMode; label: string }[] = [
  { key: "pct_geral", label: "Porcentagem" },
  { key: "saldo_atual", label: "Saldo Fechado" },
];

interface MonthData {
  pnl: number;
  tradeCount: number;
}

interface YearRow {
  year: number;
  months: (MonthData | null)[];
  ytdPnl: number;
}

function formatPct(value: number): string {
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(2)}%`;
}

function formatUsd(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function formatPnlValue(value: number): string {
  const sign = value > 0 ? "+" : "";
  return `${sign}${formatUsd(value)}`;
}

function getCellColor(value: number): string {
  if (value > 0) return "text-emerald-600 dark:text-emerald-400";
  if (value < 0) return "text-red-500 dark:text-red-400";
  return "text-muted-foreground";
}

function getCellBg(value: number): string {
  if (value > 0) return "bg-emerald-500/8 dark:bg-emerald-500/10";
  if (value < 0) return "bg-red-500/8 dark:bg-red-500/10";
  return "bg-muted/30";
}

export function MonthlyPerformanceGrid({
  trades,
  activeAccountId,
  startingBalance,
}: MonthlyPerformanceGridProps) {
  const hasBalance = startingBalance !== null && startingBalance > 0;
  const [mode, setMode] = useState<MetricMode>("pnl");
  const { mask } = usePrivacy();

  // Reset to PnL mode if balance-dependent mode is active but no balance
  useEffect(() => {
    const isBalanceMode = mode === "pct_geral" || mode === "saldo_atual";
    if (isBalanceMode && !hasBalance) {
      setMode("pnl");
    }
  }, [hasBalance, mode]);


  // Filter trades for active account
  const accountTrades = useMemo(() => {
    if (!activeAccountId) return trades.filter((t) => t.opened_at && t.net_pnl_usd !== null);
    return trades.filter(
      (t) => t.account_id === activeAccountId && t.opened_at && t.net_pnl_usd !== null
    );
  }, [trades, activeAccountId]);

  // Group by year-month
  const yearRows = useMemo<YearRow[]>(() => {
    const byYearMonth = new Map<string, MonthData>();

    for (const t of accountTrades) {
      const { year, month0 } = toForexMonthParts(t.closed_at ?? t.opened_at!);
      const key = `${year}-${month0}`;
      const existing = byYearMonth.get(key) ?? { pnl: 0, tradeCount: 0 };
      existing.pnl += t.net_pnl_usd ?? 0;
      existing.tradeCount += 1;
      byYearMonth.set(key, existing);
    }

    const years = new Set<number>();
    Array.from(byYearMonth.keys()).forEach((key) => {
      years.add(parseInt(key.split("-")[0]));
    });

    if (years.size === 0) return [];

    const sortedYears = Array.from(years).sort((a, b) => b - a);

    return sortedYears.map((year) => {
      const months: (MonthData | null)[] = [];
      let ytdPnl = 0;
      for (let m = 0; m < 12; m++) {
        const data = byYearMonth.get(`${year}-${m}`) ?? null;
        months.push(data);
        if (data) ytdPnl += data.pnl;
      }
      return { year, months, ytdPnl };
    });
  }, [accountTrades]);

  // Compute starting balance per month for percentage calculations
  const balanceByYearMonth = useMemo(() => {
    const map = new Map<string, number>();
    if (!hasBalance || yearRows.length === 0) return map;

    const sortedRows = [...yearRows].sort((a, b) => a.year - b.year);
    let runningBalance = startingBalance!;

    for (const row of sortedRows) {
      for (let m = 0; m < 12; m++) {
        const key = `${row.year}-${m}`;
        map.set(key, runningBalance);
        const data = row.months[m];
        if (data) {
          runningBalance += data.pnl;
        }
      }
    }

    return map;
  }, [yearRows, startingBalance, hasBalance]);

  // Total PnL
  const totalPnl = useMemo(
    () => yearRows.reduce((sum, row) => sum + row.ytdPnl, 0),
    [yearRows]
  );

  // Total cumulative return (only when balance available)
  const totalReturn = useMemo(() => {
    if (!hasBalance) return null;
    return (totalPnl / startingBalance!) * 100;
  }, [totalPnl, startingBalance, hasBalance]);

  function getCellValue(year: number, monthIdx: number, data: MonthData | null): string | null {
    if (!data) return null;

    if (mode === "pnl") {
      return formatPnlValue(data.pnl);
    }

    const key = `${year}-${monthIdx}`;
    const balance = balanceByYearMonth.get(key) ?? 0;

    switch (mode) {
      case "pct_geral": {
        if (!hasBalance) return "—";
        return formatPct((data.pnl / startingBalance!) * 100);
      }
      case "saldo_atual":
        return balance > 0 ? formatUsd(balance + data.pnl) : "—";
      default:
        return null;
    }
  }

  function getCellNumericValue(year: number, monthIdx: number, data: MonthData | null): number {
    if (!data) return 0;

    if (mode === "pnl") return data.pnl;

    const key = `${year}-${monthIdx}`;
    const balance = balanceByYearMonth.get(key) ?? 0;

    switch (mode) {
      case "pct_geral":
        return hasBalance ? (data.pnl / startingBalance!) * 100 : 0;
      case "saldo_atual":
        return balance + data.pnl;
      default:
        return 0;
    }
  }

  function getYtdValue(row: YearRow): string {
    if (mode === "pnl") {
      return formatPnlValue(row.ytdPnl);
    }
    if (mode === "pct_geral") {
      if (!hasBalance) return "—";
      return formatPct((row.ytdPnl / startingBalance!) * 100);
    }
    if (mode === "saldo_atual") {
      for (let m = 11; m >= 0; m--) {
        const data = row.months[m];
        if (data) {
          const key = `${row.year}-${m}`;
          const balance = balanceByYearMonth.get(key) ?? 0;
          return formatUsd(balance + data.pnl);
        }
      }
      return "—";
    }
    return "—";
  }

  function getYtdNumericValue(row: YearRow): number {
    if (mode === "pnl") return row.ytdPnl;
    return row.ytdPnl;
  }

  // Colorize based on mode
  const shouldColorize = mode === "pnl" || mode === "pct_geral";

  if (yearRows.length === 0) return null;

  return (
    <div
      className="rounded-[22px] border border-border/40 overflow-hidden isolate shadow-sm min-w-0"
      style={{ backgroundColor: "hsl(var(--card))" }}
    >
      <div className="px-5 pt-4 pb-3">
        <h3 className="text-sm font-semibold tracking-tight text-foreground">
          Desempenho
        </h3>

        {/* Metric toggles */}
        <div className="mt-3 flex flex-wrap gap-1">
          {[...BASE_METRICS, ...BALANCE_METRICS].map((m) => {
            const needsBalance = BALANCE_METRICS.some((bm) => bm.key === m.key);
            const disabled = needsBalance && !hasBalance;
            return (
              <button
                key={m.key}
                type="button"
                onClick={() => !disabled && setMode(m.key)}
                title={disabled ? "Defina um Capital Inicial para usar esta métrica" : undefined}
                className={cn(
                  "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-all border",
                  mode === m.key
                    ? "bg-foreground text-background border-foreground"
                    : disabled
                      ? "border-border/30 text-muted-foreground/40 cursor-not-allowed"
                      : "border-border/60 text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                )}
              >
                {mode === m.key && (
                  <span className="h-1.5 w-1.5 rounded-full bg-current" />
                )}
                {m.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Grid table */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-muted/30">
              <th className="sticky left-0 z-10 bg-muted/30 px-3 py-2 text-left text-[10px] uppercase tracking-wider font-semibold text-muted-foreground w-14">
                &nbsp;
              </th>
              {MONTHS.map((m) => (
                <th
                  key={m}
                  className="px-2 py-2 text-center text-[10px] uppercase tracking-wider font-semibold text-muted-foreground min-w-[68px]"
                >
                  {m}
                </th>
              ))}
              <th className="px-2 py-2 text-center text-[10px] uppercase tracking-wider font-semibold text-muted-foreground min-w-[76px]">
                YTD
              </th>
            </tr>
          </thead>
          <tbody>
            {yearRows.map((row) => {
              const ytdValue = getYtdNumericValue(row);
              return (
                <tr key={row.year} className="border-t border-border/30">
                  <td className="sticky left-0 z-10 px-3 py-2.5 text-sm font-semibold text-foreground" style={{ backgroundColor: "hsl(var(--card))" }}>
                    {row.year}
                  </td>
                  {row.months.map((data, idx) => {
                    const cellValue = getCellValue(row.year, idx, data);
                    const numericValue = getCellNumericValue(row.year, idx, data);

                    if (!data) {
                      return (
                        <td key={idx} className="px-2 py-2.5 text-center">
                          <span className="text-muted-foreground/30">—</span>
                        </td>
                      );
                    }

                    return (
                      <td key={idx} className="px-1 py-1.5 text-center">
                        <span
                          className={cn(
                            "inline-block rounded-lg px-2 py-1.5 text-xs font-semibold tabular-nums",
                            shouldColorize ? getCellBg(numericValue) : "",
                            shouldColorize ? getCellColor(numericValue) : "text-foreground"
                          )}
                        >
                          {mask(cellValue ?? "—")}
                        </span>
                      </td>
                    );
                  })}
                  <td className="px-1 py-1.5 text-center">
                    <span
                      className={cn(
                        "inline-block rounded-lg px-2 py-1.5 text-xs font-bold tabular-nums",
                        shouldColorize ? getCellBg(ytdValue) : "",
                        shouldColorize ? getCellColor(ytdValue) : "text-foreground"
                      )}
                    >
                      {mask(getYtdValue(row))}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
          {/* Total footer */}
          <tfoot>
            <tr className="border-t-2 border-border/60">
              <td colSpan={13} className="px-3 py-2" />
              <td className="px-1 py-2 text-center">
                <div className="flex flex-col items-center gap-0.5">
                  <span className="text-[10px] uppercase tracking-wider font-medium text-muted-foreground">
                    Total
                  </span>
                  <span
                    className={cn(
                      "inline-block rounded-lg px-3 py-1.5 text-xs font-bold tabular-nums",
                      shouldColorize ? getCellBg(mode === "pnl" ? totalPnl : (totalReturn ?? 0)) : "",
                      shouldColorize ? getCellColor(mode === "pnl" ? totalPnl : (totalReturn ?? 0)) : "text-foreground"
                    )}
                  >
                    {mask(
                      mode === "pnl"
                        ? formatPnlValue(totalPnl)
                        : mode === "pct_geral"
                          ? totalReturn !== null
                            ? formatPct(totalReturn)
                            : "—"
                          : (() => {
                              const lastRow = yearRows[0];
                              for (let m = 11; m >= 0; m--) {
                                const data = lastRow.months[m];
                                if (data) {
                                  const key = `${lastRow.year}-${m}`;
                                  const balance = balanceByYearMonth.get(key) ?? 0;
                                  return formatUsd(balance + data.pnl);
                                }
                              }
                              return "—";
                            })()
                    )}
                  </span>
                </div>
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
