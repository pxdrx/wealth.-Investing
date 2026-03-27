"use client";

import { useMemo, useState, useCallback } from "react";
import dynamic from "next/dynamic";
import { ChevronDown, FlaskConical, Plus, TrendingUp, TrendingDown } from "lucide-react";
import { MoneyDisplay } from "@/components/ui/MoneyDisplay";
import { cn } from "@/lib/utils";
import { usePrivacy } from "@/components/context/PrivacyContext";
import { supabase } from "@/lib/supabase/client";

const CalendarPnl = dynamic(
  () => import("@/components/calendar/CalendarPnl").then((m) => ({ default: m.CalendarPnl })),
  { ssr: false, loading: () => <div className="h-[320px] w-full rounded-xl bg-muted animate-pulse" /> },
);

interface BacktestAccount {
  id: string;
  name: string;
  is_active: boolean;
}

interface BacktestTrade {
  id?: string;
  account_id: string;
  pnl_usd: number;
  net_pnl_usd: number;
  opened_at: string;
  symbol?: string;
  direction?: string;
}

interface BacktestSectionProps {
  accounts: BacktestAccount[];
  trades: BacktestTrade[];
  userId?: string | null;
  onTradeAdded?: () => void;
}

const QUICK_SYMBOLS = [
  "XAUUSD", "EURUSD", "GBPUSD", "USDJPY", "NAS100", "US30", "BTCUSD", "USOIL",
];

function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`;
}

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

function nowTimeStr(): string {
  return new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", hour12: false });
}

// ── Inline Trade Form ──
function QuickTradeForm({ accounts, onTradeAdded }: { accounts: BacktestAccount[]; onTradeAdded?: () => void }) {
  const [symbol, setSymbol] = useState("");
  const [direction, setDirection] = useState<"long" | "short">("long");
  const [pnl, setPnl] = useState("");
  const [date, setDate] = useState(todayStr);
  const [time, setTime] = useState(nowTimeStr);
  const [accountId, setAccountId] = useState(accounts[0]?.id ?? "");
  const [observation, setObservation] = useState("");
  const [showObs, setShowObs] = useState(false);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = useCallback(async () => {
    if (!symbol.trim() || !pnl.trim() || !accountId) {
      setError("Preencha ativo, P&L e conta.");
      return;
    }
    const pnlNum = parseFloat(pnl);
    if (isNaN(pnlNum)) {
      setError("P&L deve ser um número.");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.id) {
        setError("Sessão inválida.");
        return;
      }

      const openedAt = `${date}T${time}:00`;

      const { error: dbErr } = await supabase.from("journal_trades").insert({
        user_id: session.user.id,
        account_id: accountId,
        symbol: symbol.toUpperCase().trim(),
        direction,
        pnl_usd: pnlNum,
        fees_usd: 0,
        opened_at: openedAt,
        closed_at: openedAt,
        notes: observation.trim() || null,
      });

      if (dbErr) {
        setError(dbErr.message);
        return;
      }

      setSuccess(true);
      setSymbol("");
      setPnl("");
      setObservation("");
      setDate(todayStr());
      setTime(nowTimeStr());
      onTradeAdded?.();
      setTimeout(() => setSuccess(false), 2000);
    } catch (err) {
      setError("Erro ao salvar trade.");
      console.error("[backtest] Save error:", err);
    } finally {
      setSaving(false);
    }
  }, [symbol, direction, pnl, date, time, accountId, observation, onTradeAdded]);

  return (
    <div className="rounded-[16px] border border-purple-500/20 p-4 space-y-3" style={{ backgroundColor: "hsl(var(--background))" }}>
      <div className="flex items-center gap-2 mb-1">
        <Plus className="h-3.5 w-3.5 text-purple-500" />
        <span className="text-xs font-semibold text-purple-600 dark:text-purple-400 uppercase tracking-wider">Adicionar Trade</span>
      </div>

      {/* Quick symbol buttons */}
      <div className="flex flex-wrap gap-1.5">
        {QUICK_SYMBOLS.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setSymbol(s)}
            className={cn(
              "rounded-full px-2.5 py-1 text-[10px] font-medium transition-all border",
              symbol === s
                ? "bg-purple-500 text-white border-purple-500"
                : "border-border/60 text-muted-foreground hover:border-purple-500/40 hover:text-foreground"
            )}
          >
            {s}
          </button>
        ))}
      </div>

      {/* Account selector (if multiple) */}
      {accounts.length > 1 && (
        <select
          value={accountId}
          onChange={(e) => setAccountId(e.target.value)}
          className="w-full rounded-lg border border-border/40 bg-transparent px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-purple-500"
        >
          {accounts.map((a) => (
            <option key={a.id} value={a.id}>{a.name}</option>
          ))}
        </select>
      )}

      {/* Main row: Symbol + Direction + PnL */}
      <div className="flex gap-2">
        <input
          type="text"
          value={symbol}
          onChange={(e) => setSymbol(e.target.value)}
          placeholder="Ativo (ex: XAUUSD)"
          className="flex-1 rounded-lg border border-border/40 bg-transparent px-3 py-2 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-purple-500 uppercase"
        />
        <div className="flex rounded-lg border border-border/40 overflow-hidden">
          <button
            type="button"
            onClick={() => setDirection("long")}
            className={cn(
              "flex items-center gap-1 px-3 py-2 text-xs font-medium transition-colors",
              direction === "long" ? "bg-green-500 text-white" : "text-muted-foreground hover:bg-muted/50"
            )}
          >
            <TrendingUp className="h-3 w-3" />
            Buy
          </button>
          <button
            type="button"
            onClick={() => setDirection("short")}
            className={cn(
              "flex items-center gap-1 px-3 py-2 text-xs font-medium transition-colors",
              direction === "short" ? "bg-red-500 text-white" : "text-muted-foreground hover:bg-muted/50"
            )}
          >
            <TrendingDown className="h-3 w-3" />
            Sell
          </button>
        </div>
        <input
          type="number"
          value={pnl}
          onChange={(e) => setPnl(e.target.value)}
          placeholder="P&L ($)"
          step="0.01"
          className="w-24 rounded-lg border border-border/40 bg-transparent px-3 py-2 text-xs font-medium tabular-nums focus:outline-none focus:ring-1 focus:ring-purple-500"
        />
      </div>

      {/* Date + Time row */}
      <div className="flex gap-2">
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="flex-1 rounded-lg border border-border/40 bg-transparent px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-purple-500"
        />
        <input
          type="time"
          value={time}
          onChange={(e) => setTime(e.target.value)}
          className="w-28 rounded-lg border border-border/40 bg-transparent px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-purple-500"
        />
      </div>

      {/* Observation — collapsible */}
      <button
        type="button"
        onClick={() => setShowObs((v) => !v)}
        className="text-[10px] text-muted-foreground hover:text-foreground transition-colors"
      >
        {showObs ? "▾ Ocultar observações" : "▸ Adicionar observações"}
      </button>
      {showObs && (
        <textarea
          value={observation}
          onChange={(e) => setObservation(e.target.value)}
          placeholder="Contexto, motivo da entrada, observações..."
          rows={2}
          className="w-full rounded-lg border border-border/40 bg-transparent px-3 py-2 text-[11px] focus:outline-none focus:ring-1 focus:ring-purple-500 resize-none"
        />
      )}

      {/* Submit */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={handleSubmit}
          disabled={saving}
          className={cn(
            "flex-1 rounded-lg py-2.5 text-xs font-semibold transition-all",
            success
              ? "bg-green-500 text-white"
              : "bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-50"
          )}
        >
          {saving ? "Salvando..." : success ? "Trade adicionado!" : "Adicionar trade"}
        </button>
      </div>
      {error && <p className="text-[11px] text-red-500">{error}</p>}
    </div>
  );
}

// ── Main Section ──
export function BacktestSection({ accounts, trades, userId, onTradeAdded }: BacktestSectionProps) {
  const [expanded, setExpanded] = useState(true);
  const { mask } = usePrivacy();

  const activeAccounts = useMemo(
    () => accounts.filter((a) => a.is_active),
    [accounts]
  );

  // Per-account stats
  const accountStats = useMemo(() => {
    return activeAccounts.map((account) => {
      const accTrades = trades.filter((t) => t.account_id === account.id);
      const totalPnl = accTrades.reduce((s, t) => s + t.net_pnl_usd, 0);
      const wins = accTrades.filter((t) => t.net_pnl_usd > 0).length;
      const losses = accTrades.filter((t) => t.net_pnl_usd < 0).length;
      const totalTrades = accTrades.length;
      const winRate = totalTrades > 0 ? (wins / totalTrades) * 100 : 0;

      const totalWinAmount = accTrades
        .filter((t) => t.net_pnl_usd > 0)
        .reduce((s, t) => s + t.net_pnl_usd, 0);
      const totalLossAmount = accTrades
        .filter((t) => t.net_pnl_usd < 0)
        .reduce((s, t) => s + Math.abs(t.net_pnl_usd), 0);
      const profitFactor = totalLossAmount > 0
        ? totalWinAmount / totalLossAmount
        : totalWinAmount > 0 ? Infinity : 0;

      let peak = 0;
      let maxDD = 0;
      let cumPnl = 0;
      const sorted = [...accTrades].sort((a, b) => a.opened_at.localeCompare(b.opened_at));
      for (const t of sorted) {
        cumPnl += t.net_pnl_usd;
        if (cumPnl > peak) peak = cumPnl;
        const dd = peak - cumPnl;
        if (dd > maxDD) maxDD = dd;
      }

      const monthlyMap = new Map<string, { pnl: number; wins: number; total: number }>();
      for (const t of accTrades) {
        const month = t.opened_at.slice(0, 7);
        const entry = monthlyMap.get(month) ?? { pnl: 0, wins: 0, total: 0 };
        entry.pnl += t.net_pnl_usd;
        entry.total += 1;
        if (t.net_pnl_usd > 0) entry.wins += 1;
        monthlyMap.set(month, entry);
      }

      const months = Array.from(monthlyMap.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([month, data]) => ({
          month,
          pnl: data.pnl,
          winRate: data.total > 0 ? (data.wins / data.total) * 100 : 0,
          trades: data.total,
        }));

      return { account, totalPnl, wins, losses, totalTrades, winRate, profitFactor, maxDD, months };
    });
  }, [activeAccounts, trades]);

  // Global stats
  const globalStats = useMemo(() => {
    const allTrades = trades.filter((t) => activeAccounts.some((a) => a.id === t.account_id));
    const totalPnl = allTrades.reduce((s, t) => s + t.net_pnl_usd, 0);
    const wins = allTrades.filter((t) => t.net_pnl_usd > 0).length;
    const total = allTrades.length;
    const winRate = total > 0 ? (wins / total) * 100 : 0;
    const totalWinAmount = allTrades.filter((t) => t.net_pnl_usd > 0).reduce((s, t) => s + t.net_pnl_usd, 0);
    const totalLossAmount = allTrades.filter((t) => t.net_pnl_usd < 0).reduce((s, t) => s + Math.abs(t.net_pnl_usd), 0);
    const profitFactor = totalLossAmount > 0 ? totalWinAmount / totalLossAmount : totalWinAmount > 0 ? Infinity : 0;
    return { totalPnl, wins, losses: total - wins, totalTrades: total, winRate, profitFactor };
  }, [trades, activeAccounts]);

  const pnlColor = (v: number) =>
    v > 0 ? "hsl(var(--pnl-positive))" : v < 0 ? "hsl(var(--pnl-negative))" : "hsl(var(--landing-text-muted))";

  return (
    <div className="bg-card rounded-[22px] overflow-hidden relative isolate border border-border/40 shadow-sm">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center gap-3 px-5 py-4 text-left transition-colors hover:bg-accent/50"
      >
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-500/10">
          <FlaskConical className="h-4 w-4 text-purple-500" />
        </div>
        <div className="flex-1">
          <h3 className="text-sm font-semibold tracking-tight">Contas em Backtest</h3>
          <p className="text-[11px] text-muted-foreground">
            {activeAccounts.length > 0
              ? `${activeAccounts.length} conta${activeAccounts.length !== 1 ? "s" : ""} · ${globalStats.totalTrades} trades`
              : "Simule estratégias sem arriscar capital real"}
          </p>
        </div>
        <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", expanded && "rotate-180")} />
      </button>

      {expanded && (
        <div className="border-t border-border/40 px-5 pb-5">
          {activeAccounts.length === 0 && (
            <div className="py-8 text-center">
              <FlaskConical className="mx-auto h-8 w-8 text-purple-500/40 mb-3" />
              <p className="text-sm font-medium text-foreground mb-1">Nenhuma conta de backtest</p>
              <p className="text-xs text-muted-foreground mb-4">
                Crie uma conta do tipo &quot;Backtest&quot; para simular estratégias e acompanhar resultados.
              </p>
            </div>
          )}
          {activeAccounts.length > 0 && (<>
            {/* Quick Trade Form */}
            <div className="pt-4 pb-3">
              <QuickTradeForm accounts={activeAccounts} onTradeAdded={onTradeAdded} />
            </div>

            {/* Global KPIs */}
            <div className="grid grid-cols-3 md:grid-cols-6 gap-2 pt-2 pb-4">
              {[
                { label: "P&L TOTAL", value: mask(`$${Math.abs(globalStats.totalPnl).toFixed(0)}`), color: pnlColor(globalStats.totalPnl), prefix: globalStats.totalPnl >= 0 ? "+" : "-" },
                { label: "WIN RATE", value: globalStats.totalTrades > 0 ? formatPercent(globalStats.winRate) : "—", color: globalStats.winRate >= 50 ? "hsl(var(--pnl-positive))" : "hsl(var(--pnl-negative))" },
                { label: "PROFIT FACTOR", value: globalStats.profitFactor === Infinity ? "∞" : globalStats.profitFactor > 0 ? globalStats.profitFactor.toFixed(2) : "—", color: globalStats.profitFactor >= 1 ? "hsl(var(--pnl-positive))" : "hsl(var(--pnl-negative))" },
                { label: "TRADES", value: `${globalStats.wins}W / ${globalStats.losses}L`, color: "hsl(var(--landing-text))" },
                { label: "CONTAS", value: activeAccounts.length.toString(), color: "hsl(var(--landing-text))" },
                { label: "TOTAL TRADES", value: globalStats.totalTrades.toString(), color: "hsl(var(--landing-text))" },
              ].map((kpi) => (
                <div
                  key={kpi.label}
                  className="rounded-lg px-3 py-2.5"
                  style={{ backgroundColor: "hsl(var(--landing-bg-tertiary))" }}
                >
                  <p className="text-[9px] uppercase tracking-wider mb-1 text-muted-foreground">{kpi.label}</p>
                  <p className="text-sm font-semibold tabular-nums" style={{ color: kpi.color }}>
                    {"prefix" in kpi && kpi.prefix ? `${kpi.prefix}${kpi.value}` : kpi.value}
                  </p>
                </div>
              ))}
            </div>

            {/* Backtest Calendar */}
            {globalStats.totalTrades > 0 && (
              <div className="pb-3">
                <CalendarPnl
                  trades={trades.map((t) => ({
                    id: t.id ?? `bt-${t.opened_at}-${t.account_id}`,
                    net_pnl_usd: t.net_pnl_usd,
                    opened_at: t.opened_at,
                    account_id: t.account_id,
                    symbol: t.symbol ?? "",
                    direction: t.direction ?? "long",
                  }))}
                  accounts={activeAccounts.map((a) => ({ id: a.id, name: a.name }))}
                  userId={userId}
                />
              </div>
            )}

            {/* Per-account cards */}
            <div className="space-y-3">
              {accountStats.map(({ account, totalPnl, winRate, profitFactor, maxDD, totalTrades, wins, losses, months }) => (
                <div
                  key={account.id}
                  className="rounded-[16px] border border-border/30 overflow-hidden"
                  style={{ backgroundColor: "hsl(var(--background))" }}
                >
                  <div className="flex items-center justify-between px-4 py-3">
                    <div>
                      <p className="text-sm font-semibold" style={{ color: "hsl(var(--landing-text))" }}>{account.name}</p>
                      <p className="text-[11px] text-muted-foreground">{totalTrades} trades · {wins}W / {losses}L</p>
                    </div>
                    <div className="text-right">
                      <MoneyDisplay value={totalPnl} showSign colorize className="text-sm font-semibold" />
                      <p className="text-[11px] text-muted-foreground">
                        WR {formatPercent(winRate)} · PF {profitFactor === Infinity ? "∞" : profitFactor.toFixed(2)}
                      </p>
                    </div>
                  </div>

                  {months.length > 0 && (
                    <div className="border-t border-border/20 px-4 py-3">
                      <p className="text-[9px] uppercase tracking-wider mb-2 text-muted-foreground">Assertividade mensal</p>
                      <div className="flex flex-wrap gap-1.5">
                        {months.map((m) => {
                          const [, mm] = m.month.split("-");
                          const monthLabel = new Date(2024, Number(mm) - 1).toLocaleDateString("pt-BR", { month: "short" });
                          return (
                            <div
                              key={m.month}
                              className="flex flex-col items-center rounded-lg px-2.5 py-1.5 min-w-[52px]"
                              style={{
                                backgroundColor: m.pnl > 0
                                  ? "hsl(var(--pnl-positive) / 0.1)"
                                  : m.pnl < 0
                                    ? "hsl(var(--pnl-negative) / 0.1)"
                                    : "hsl(var(--muted) / 0.3)",
                              }}
                            >
                              <span className="text-[10px] font-medium text-muted-foreground">{monthLabel}</span>
                              <span className="text-xs font-bold tabular-nums" style={{ color: m.winRate >= 50 ? "hsl(var(--pnl-positive))" : "hsl(var(--pnl-negative))" }}>
                                {formatPercent(m.winRate)}
                              </span>
                              <span className="text-[9px] text-muted-foreground">{m.trades}t</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {maxDD > 0 && (
                    <div className="border-t border-border/20 px-4 py-2 flex items-center justify-between">
                      <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Max Drawdown</span>
                      <span className="text-xs font-semibold tabular-nums" style={{ color: "hsl(var(--pnl-negative))" }}>
                        {mask(`-$${maxDD.toFixed(0)}`)}
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </>)}
        </div>
      )}
    </div>
  );
}
