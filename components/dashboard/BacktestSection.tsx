"use client";

import { useMemo, useState, useCallback } from "react";
import dynamic from "next/dynamic";
import { ChevronDown, FlaskConical, Plus, TrendingUp, TrendingDown, PlusCircle } from "lucide-react";
import { MoneyDisplay } from "@/components/ui/MoneyDisplay";
import { cn } from "@/lib/utils";
import { usePrivacy } from "@/components/context/PrivacyContext";
import { supabase } from "@/lib/supabase/client";
import { AddAccountModal } from "@/components/account/AddAccountModal";
import { useActiveAccount } from "@/components/context/ActiveAccountContext";

const CalendarPnl = dynamic(
  () => import("@/components/calendar/CalendarPnl").then((m) => ({ default: m.CalendarPnl })),
  { ssr: false, loading: () => <div className="h-[260px] w-full rounded-xl bg-muted animate-pulse" /> },
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

const QUICK_SYMBOLS = ["XAUUSD", "EURUSD", "GBPUSD", "USDJPY", "NAS100", "US30", "BTCUSD", "USOIL"];

function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`;
}

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

function nowTimeStr(): string {
  return new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", hour12: false });
}

function detectCategory(sym: string): string {
  const COMMODITIES = ["XAUUSD", "XAGUSD", "USOIL", "UKOIL", "NATGAS"];
  const INDICES = ["NAS100", "US30", "US500", "SPX500", "DAX", "FTSE", "NIKKEI"];
  const CRYPTO = ["BTCUSD", "ETHUSD", "BTCUSDT", "ETHUSDT"];
  if (COMMODITIES.some((c) => sym.includes(c))) return "commodities";
  if (INDICES.some((c) => sym.includes(c))) return "indices";
  if (CRYPTO.some((c) => sym.includes(c))) return "crypto";
  return "forex";
}

// ── Inline Trade Form ──
function QuickTradeForm({ accountId, onTradeAdded }: { accountId: string; onTradeAdded?: () => void }) {
  const [symbol, setSymbol] = useState("");
  const [direction, setDirection] = useState<"buy" | "sell">("buy");
  const [pnl, setPnl] = useState("");
  const [date, setDate] = useState(todayStr);
  const [time, setTime] = useState(nowTimeStr);
  const [observation, setObservation] = useState("");
  const [showObs, setShowObs] = useState(false);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = useCallback(async () => {
    if (!symbol.trim() || !pnl.trim() || !accountId) {
      setError("Preencha ativo e P&L.");
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
      if (!session?.user?.id) { setError("Sessão inválida."); return; }

      const openedAt = `${date}T${time}:00`;
      const sym = symbol.toUpperCase().trim();

      const { error: dbErr } = await supabase.from("journal_trades").insert({
        user_id: session.user.id,
        account_id: accountId,
        symbol: sym,
        category: detectCategory(sym),
        direction,
        pnl_usd: pnlNum,
        fees_usd: 0,
        opened_at: openedAt,
        closed_at: openedAt,
        notes: observation.trim() || null,
        mistakes: [],
      });

      if (dbErr) { setError(dbErr.message); return; }

      // Reset form immediately
      setSymbol("");
      setPnl("");
      setObservation("");
      setShowObs(false);
      setDate(todayStr());
      setTime(nowTimeStr());
      setSuccess(true);
      setSaving(false);

      // Refresh data immediately so calendar/KPIs update
      onTradeAdded?.();

      // Clear success badge after 1.5s
      setTimeout(() => setSuccess(false), 1500);
      return; // skip finally setSaving since we already did it
    } catch (err) {
      setError("Erro ao salvar trade.");
      console.error("[backtest] Save error:", err);
    } finally {
      setSaving(false);
    }
  }, [symbol, direction, pnl, date, time, accountId, observation, onTradeAdded]);

  return (
    <div className="rounded-[14px] border border-purple-500/20 p-3 space-y-2.5" style={{ backgroundColor: "hsl(var(--background))" }}>
      <div className="flex items-center gap-2">
        <Plus className="h-3 w-3 text-purple-500" />
        <span className="text-[10px] font-semibold text-purple-600 dark:text-purple-400 uppercase tracking-wider">Adicionar Trade</span>
      </div>

      {/* Quick symbol buttons */}
      <div className="flex flex-wrap gap-1">
        {QUICK_SYMBOLS.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setSymbol(s)}
            className={cn(
              "rounded-full px-2 py-0.5 text-[9px] font-medium transition-all border",
              symbol === s
                ? "bg-purple-500 text-white border-purple-500"
                : "border-border/60 text-muted-foreground hover:border-purple-500/40"
            )}
          >
            {s}
          </button>
        ))}
      </div>

      {/* Symbol + Direction + PnL */}
      <div className="flex gap-1.5">
        <input
          type="text"
          value={symbol}
          onChange={(e) => setSymbol(e.target.value)}
          placeholder="Ativo"
          aria-label="Ativo"
          className="flex-1 rounded-lg border border-border/40 bg-transparent px-2.5 py-1.5 text-xs font-medium focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-purple-500 uppercase"
        />
        <div className="flex rounded-lg border border-border/40 overflow-hidden">
          <button
            type="button"
            onClick={() => setDirection("buy")}
            className={cn("px-2.5 py-1.5 text-[10px] font-medium transition-colors", direction === "buy" ? "bg-green-500 text-white" : "text-muted-foreground")}
          >
            Buy
          </button>
          <button
            type="button"
            onClick={() => setDirection("sell")}
            className={cn("px-2.5 py-1.5 text-[10px] font-medium transition-colors", direction === "sell" ? "bg-red-500 text-white" : "text-muted-foreground")}
          >
            Sell
          </button>
        </div>
        <input
          type="number"
          value={pnl}
          onChange={(e) => setPnl(e.target.value)}
          placeholder="P&L ($)"
          aria-label="P&L em dólares"
          step="0.01"
          className="w-20 rounded-lg border border-border/40 bg-transparent px-2.5 py-1.5 text-xs font-medium tabular-nums focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-purple-500"
        />
      </div>

      {/* Date + Time */}
      <div className="flex gap-1.5">
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} aria-label="Data da operação" className="flex-1 rounded-lg border border-border/40 bg-transparent px-2.5 py-1.5 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-purple-500" />
        <input type="time" value={time} onChange={(e) => setTime(e.target.value)} aria-label="Hora da operação" className="w-24 rounded-lg border border-border/40 bg-transparent px-2.5 py-1.5 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-purple-500" />
      </div>

      {/* Observation — collapsible */}
      <button type="button" onClick={() => setShowObs((v) => !v)} className="text-[9px] text-muted-foreground hover:text-foreground transition-colors">
        {showObs ? "▾ Ocultar observações" : "▸ Adicionar observações"}
      </button>
      {showObs && (
        <textarea value={observation} onChange={(e) => setObservation(e.target.value)} placeholder="Contexto, motivo da entrada..." aria-label="Observações" rows={2} className="w-full rounded-lg border border-border/40 bg-transparent px-2.5 py-1.5 text-[10px] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-purple-500 resize-none" />
      )}

      {/* Submit */}
      <button
        type="button"
        onClick={handleSubmit}
        disabled={saving}
        className={cn("w-full rounded-lg py-2 text-xs font-semibold transition-all", success ? "bg-green-500 text-white" : "bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-50")}
      >
        {saving ? "Salvando..." : success ? "Trade adicionado!" : "Adicionar trade"}
      </button>
      {error && <p className="text-[10px] text-red-500">{error}</p>}
    </div>
  );
}

// ── Main Section ──
export function BacktestSection({ accounts, trades, userId, onTradeAdded }: BacktestSectionProps) {
  const [expanded, setExpanded] = useState(true);
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null); // null = all
  const [addModalOpen, setAddModalOpen] = useState(false);
  const { mask } = usePrivacy();
  const { refreshAccounts } = useActiveAccount();

  const activeAccounts = useMemo(() => accounts.filter((a) => a.is_active), [accounts]);

  // Filter trades by selected account
  const filteredTrades = useMemo(() => {
    if (!selectedAccountId) return trades.filter((t) => activeAccounts.some((a) => a.id === t.account_id));
    return trades.filter((t) => t.account_id === selectedAccountId);
  }, [trades, selectedAccountId, activeAccounts]);

  // Stats for filtered trades
  const stats = useMemo(() => {
    const totalPnl = filteredTrades.reduce((s, t) => s + t.net_pnl_usd, 0);
    const wins = filteredTrades.filter((t) => t.net_pnl_usd > 0).length;
    const total = filteredTrades.length;
    const winRate = total > 0 ? (wins / total) * 100 : 0;
    const totalWinAmount = filteredTrades.filter((t) => t.net_pnl_usd > 0).reduce((s, t) => s + t.net_pnl_usd, 0);
    const totalLossAmount = filteredTrades.filter((t) => t.net_pnl_usd < 0).reduce((s, t) => s + Math.abs(t.net_pnl_usd), 0);
    const profitFactor = totalLossAmount > 0 ? totalWinAmount / totalLossAmount : totalWinAmount > 0 ? Infinity : 0;

    let peak = 0, maxDD = 0, cumPnl = 0;
    const sorted = [...filteredTrades].sort((a, b) => a.opened_at.localeCompare(b.opened_at));
    for (const t of sorted) {
      cumPnl += t.net_pnl_usd;
      if (cumPnl > peak) peak = cumPnl;
      const dd = peak - cumPnl;
      if (dd > maxDD) maxDD = dd;
    }

    return { totalPnl, wins, losses: total - wins, totalTrades: total, winRate, profitFactor, maxDD };
  }, [filteredTrades]);

  const pnlColor = (v: number) =>
    v > 0 ? "hsl(var(--pnl-positive))" : v < 0 ? "hsl(var(--pnl-negative))" : "hsl(var(--landing-text-muted))";

  const selectedAccount = selectedAccountId ? activeAccounts.find((a) => a.id === selectedAccountId) : null;
  const currentAccountId = selectedAccountId ?? activeAccounts[0]?.id ?? "";

  return (
    <>
    <div className="bg-card rounded-[22px] overflow-hidden relative isolate border border-border/40 shadow-sm" style={{ backgroundColor: "hsl(var(--card))" }}>
      {/* Header */}
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center gap-3 px-5 py-3.5 text-left transition-colors hover:bg-accent/50"
      >
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-purple-500/10">
          <FlaskConical className="h-3.5 w-3.5 text-purple-500" />
        </div>
        <div className="flex-1">
          <h3 className="text-sm font-semibold tracking-tight">Backtest</h3>
          <p className="text-[10px] text-muted-foreground">
            {activeAccounts.length > 0
              ? `${activeAccounts.length} conta${activeAccounts.length !== 1 ? "s" : ""} · ${stats.totalTrades} trades`
              : "Simule estratégias sem arriscar capital real"}
          </p>
        </div>
        <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", expanded && "rotate-180")} />
      </button>

      {expanded && (
        <div className="border-t border-border/40 px-4 pb-4">
          {/* Account selector pills + Add account button */}
          <div className="flex items-center gap-2 pt-3 pb-2 flex-wrap">
            <button
              type="button"
              onClick={() => setSelectedAccountId(null)}
              className={cn(
                "rounded-full px-3 py-1.5 text-[11px] font-medium transition-all border",
                !selectedAccountId
                  ? "bg-purple-500 text-white border-purple-500"
                  : "border-border/60 text-muted-foreground hover:border-purple-500/40 hover:text-foreground"
              )}
            >
              Todas
            </button>
            {activeAccounts.map((a) => (
              <button
                key={a.id}
                type="button"
                onClick={() => setSelectedAccountId(a.id)}
                className={cn(
                  "rounded-full px-3 py-1.5 text-[11px] font-medium transition-all border",
                  selectedAccountId === a.id
                    ? "bg-purple-500 text-white border-purple-500"
                    : "border-border/60 text-muted-foreground hover:border-purple-500/40 hover:text-foreground"
                )}
              >
                {a.name}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setAddModalOpen(true)}
              className="flex items-center gap-1 rounded-full border border-dashed border-purple-500/30 px-3 py-1.5 text-[10px] font-medium text-purple-500 transition-colors hover:bg-purple-500/5"
            >
              <PlusCircle className="h-3 w-3" />
              Nova
            </button>
          </div>

          {activeAccounts.length === 0 && (
            <div className="py-6 text-center">
              <FlaskConical className="mx-auto h-7 w-7 text-purple-500/40 mb-2" />
              <p className="text-xs font-medium text-foreground mb-1">Nenhuma conta de backtest</p>
              <p className="text-[10px] text-muted-foreground mb-3">
                Crie uma conta &quot;Backtest&quot; para simular estratégias.
              </p>
            </div>
          )}

          {activeAccounts.length > 0 && (<>
            {/* Quick Trade Form — hidden in "Todas" mode */}
            {selectedAccountId && (
              <div className="pb-2">
                <QuickTradeForm accountId={selectedAccountId} onTradeAdded={onTradeAdded} />
              </div>
            )}
            {!selectedAccountId && (
              <p className="text-[10px] text-muted-foreground pt-2 pb-1 italic">
                Selecione uma conta para adicionar trades.
              </p>
            )}

            {/* KPIs */}
            <div className="grid grid-cols-3 md:grid-cols-6 gap-1.5 pt-2 pb-3">
              {[
                { label: "P&L", value: mask(`$${Math.abs(stats.totalPnl).toFixed(0)}`), color: pnlColor(stats.totalPnl), prefix: stats.totalPnl >= 0 ? "+" : "-" },
                { label: "WIN RATE", value: stats.totalTrades > 0 ? formatPercent(stats.winRate) : "—", color: stats.winRate >= 50 ? "hsl(var(--pnl-positive))" : stats.totalTrades > 0 ? "hsl(var(--pnl-negative))" : "hsl(var(--landing-text-muted))" },
                { label: "PF", value: stats.profitFactor === Infinity ? "∞" : stats.profitFactor > 0 ? stats.profitFactor.toFixed(2) : "—", color: stats.profitFactor >= 1 ? "hsl(var(--pnl-positive))" : stats.totalTrades > 0 ? "hsl(var(--pnl-negative))" : "hsl(var(--landing-text-muted))" },
                { label: "TRADES", value: `${stats.wins}W / ${stats.losses}L`, color: "hsl(var(--landing-text))" },
                { label: "MAX DD", value: stats.maxDD > 0 ? mask(`-$${stats.maxDD.toFixed(0)}`) : "—", color: stats.maxDD > 0 ? "hsl(var(--pnl-negative))" : "hsl(var(--landing-text-muted))" },
                { label: "TOTAL", value: stats.totalTrades.toString(), color: "hsl(var(--landing-text))" },
              ].map((kpi) => (
                <div key={kpi.label} className="rounded-lg px-2.5 py-2" style={{ backgroundColor: "hsl(var(--landing-bg-tertiary))" }}>
                  <p className="text-[8px] uppercase tracking-wider mb-0.5 text-muted-foreground">{kpi.label}</p>
                  <p className="text-xs font-semibold tabular-nums" style={{ color: kpi.color }}>
                    {"prefix" in kpi && kpi.prefix ? `${kpi.prefix}${kpi.value}` : kpi.value}
                  </p>
                </div>
              ))}
            </div>

            {/* Calendar */}
            <CalendarPnl
              trades={filteredTrades.map((t) => ({
                id: t.id ?? `bt-${t.opened_at}-${t.account_id}`,
                net_pnl_usd: t.net_pnl_usd,
                opened_at: t.opened_at,
                account_id: t.account_id,
                symbol: t.symbol ?? "",
                direction: t.direction ?? "long",
              }))}
              accounts={selectedAccountId ? undefined : activeAccounts.map((a) => ({ id: a.id, name: a.name }))}
              userId={userId}
              accountId={selectedAccountId ?? null}
              accountIds={activeAccounts.map((a) => a.id)}
              defaultReadOnly
              title={selectedAccount ? selectedAccount.name : "Calendário Backtest"}
              compact
              onTradeDeleted={onTradeAdded}
            />
          </>)}
        </div>
      )}
    </div>

    <AddAccountModal
      open={addModalOpen}
      onOpenChange={setAddModalOpen}
      onAccountCreated={async (id) => {
        setSelectedAccountId(id);
        await refreshAccounts();
        onTradeAdded?.();
      }}
      onRefreshAccounts={refreshAccounts}
      defaultKind="backtest"
    />
    </>
  );
}
