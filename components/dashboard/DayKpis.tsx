"use client";

import { useEffect, useState } from "react";
import { safeGetSession } from "@/lib/supabase/safe-session";
import { useActiveAccount } from "@/components/context/ActiveAccountContext";

type Mood = "calm" | "focused" | "accelerated" | "drifting" | "flow";

interface TodayStats {
  pnl: { amount: number; currency: string; trades: number; winRate: number; sparkline: number[] };
  drawdown: { current: number | null; limit: number | null; propFirmName: string | null };
  mood: { state: Mood; confidence: number };
  trades: Array<{ id: string; timestamp: string; pnl: number; instrument: string; side: "long" | "short" }>;
  sessions: Array<{ market: string; openUtc: string; closeUtc: string }>;
  generatedAt: string;
}

type LoadState =
  | { kind: "loading" }
  | { kind: "success"; data: TodayStats }
  | { kind: "error" }
  | { kind: "idle" }; // no active account

const MOOD_LABEL_PT: Record<Mood, string> = {
  calm: "Calmo",
  focused: "Focado",
  flow: "Em flow",
  accelerated: "Acelerado",
  drifting: "Em deriva",
};

const MOOD_TONE: Record<Mood, string> = {
  calm: "bg-white/5 text-white/80",
  focused: "bg-sky-500/10 text-sky-200",
  flow: "bg-emerald-500/15 text-emerald-200",
  accelerated: "bg-amber-500/15 text-amber-200",
  drifting: "bg-rose-500/15 text-rose-200",
};

function fmtCurrency(n: number): string {
  const sign = n > 0 ? "+" : n < 0 ? "-" : "";
  const abs = Math.abs(n);
  return `${sign}$${abs.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// Fetches /api/dashboard/today-stats for the active account.
export function DayKpis() {
  const { activeAccountId } = useActiveAccount();
  const [state, setState] = useState<LoadState>({ kind: "loading" });

  useEffect(() => {
    let cancelled = false;
    if (!activeAccountId) {
      setState({ kind: "idle" });
      return;
    }
    setState({ kind: "loading" });
    (async () => {
      const { data: { session } } = await safeGetSession();
      if (cancelled) return;
      if (!session) {
        setState({ kind: "error" });
        return;
      }
      try {
        const res = await fetch(
          `/api/dashboard/today-stats?account_id=${encodeURIComponent(activeAccountId)}`,
          {
            headers: { Authorization: `Bearer ${session.access_token}` },
            cache: "no-store",
          }
        );
        if (cancelled) return;
        if (!res.ok) {
          setState({ kind: "error" });
          return;
        }
        const data = (await res.json()) as TodayStats;
        if (!cancelled) setState({ kind: "success", data });
      } catch {
        if (!cancelled) setState({ kind: "error" });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [activeAccountId]);

  if (state.kind === "loading") return <KpisSkeleton />;
  if (state.kind === "error" || state.kind === "idle") return <KpisFallback />;

  const { pnl, drawdown, mood } = state.data;
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
      <PnlCard pnl={pnl} />
      <DrawdownCard drawdown={drawdown} />
      <MoodCard mood={mood} tradesCount={pnl.trades} />
    </div>
  );
}

function CardShell({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="rounded-xl border p-5 text-white"
      style={{
        backgroundColor: "hsl(220 8% 10%)",
        borderColor: "hsl(220 6% 18%)",
      }}
    >
      {children}
    </div>
  );
}

function KpisSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <CardShell key={i}>
          <div className="h-3 w-20 rounded bg-white/10 animate-pulse" />
          <div className="mt-3 h-8 w-32 rounded bg-white/10 animate-pulse" />
          <div className="mt-3 h-3 w-40 rounded bg-white/5 animate-pulse" />
        </CardShell>
      ))}
    </div>
  );
}

function KpisFallback() {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
      <CardShell>
        <p className="text-xs uppercase tracking-wider text-white/50">PnL hoje</p>
        <p className="mt-2 text-3xl font-semibold tabular-nums text-white/70">—</p>
        <p className="mt-2 text-xs text-white/40">Sem conta ativa</p>
      </CardShell>
      <CardShell>
        <p className="text-xs uppercase tracking-wider text-white/50">Daily drawdown</p>
        <p className="mt-2 text-3xl font-semibold tabular-nums text-white/70">—</p>
        <p className="mt-2 text-xs text-white/40">Sem conta ativa</p>
      </CardShell>
      <CardShell>
        <p className="text-xs uppercase tracking-wider text-white/50">Estado</p>
        <p className="mt-2 text-2xl font-semibold text-white/70">—</p>
        <p className="mt-2 text-xs text-white/40">Sem conta ativa</p>
      </CardShell>
    </div>
  );
}

function PnlCard({ pnl }: { pnl: TodayStats["pnl"] }) {
  const color = pnl.amount > 0 ? "#34d399" : pnl.amount < 0 ? "#f87171" : "#e5e7eb";
  const winRatePct = Math.round(pnl.winRate * 100);
  return (
    <CardShell>
      <p className="text-xs uppercase tracking-wider text-white/50">PnL hoje</p>
      <div className="mt-2 flex items-end justify-between gap-3">
        <p className="text-3xl font-semibold tabular-nums" style={{ color }}>
          {fmtCurrency(pnl.amount)}
        </p>
        <Sparkline values={pnl.sparkline} stroke={color} />
      </div>
      <p className="mt-3 text-xs text-white/50 tabular-nums">
        {pnl.trades} trade{pnl.trades === 1 ? "" : "s"} · {winRatePct}% win rate
      </p>
    </CardShell>
  );
}

function DrawdownCard({ drawdown }: { drawdown: TodayStats["drawdown"] }) {
  const hasLimit = drawdown.limit !== null && drawdown.limit > 0;
  const current = drawdown.current ?? 0;
  const pct = hasLimit ? Math.min(1, Math.abs(current) / (drawdown.limit as number)) : 0;
  const pctInt = Math.round(pct * 100);
  const barColor =
    pct >= 0.75 ? "#f87171" : pct >= 0.5 ? "#fbbf24" : "#34d399";

  return (
    <CardShell>
      <p className="text-xs uppercase tracking-wider text-white/50">Daily drawdown</p>
      {!hasLimit ? (
        <>
          <p className="mt-2 text-3xl font-semibold tabular-nums text-white/70">—</p>
          <p className="mt-3 text-xs text-white/40">
            Configure uma prop firm pra habilitar regra de risco.
          </p>
        </>
      ) : (
        <>
          <p className="mt-2 text-2xl font-semibold tabular-nums">
            {fmtCurrency(current)}{" "}
            <span className="text-white/40 text-sm font-normal">
              / {fmtCurrency(-(drawdown.limit as number))} ({pctInt}%)
            </span>
          </p>
          <div className="mt-3 h-1.5 w-full rounded-full bg-white/10 overflow-hidden">
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${pctInt}%`, backgroundColor: barColor }}
            />
          </div>
          <p className="mt-3 text-xs text-white/50">
            {drawdown.propFirmName ?? "Prop firm"}
          </p>
        </>
      )}
    </CardShell>
  );
}

function MoodCard({ mood, tradesCount }: { mood: TodayStats["mood"]; tradesCount: number }) {
  return (
    <CardShell>
      <p className="text-xs uppercase tracking-wider text-white/50">Estado</p>
      <div className="mt-2">
        <span
          className={`inline-flex items-center rounded-full px-4 py-1.5 text-lg font-semibold ${MOOD_TONE[mood.state]}`}
        >
          {MOOD_LABEL_PT[mood.state]}
        </span>
      </div>
      <p className="mt-3 text-xs text-white/50">
        {/* TODO(A-02): replace with voice.ts copy */}
        Baseado em {tradesCount} trade{tradesCount === 1 ? "" : "s"} de hoje
      </p>
    </CardShell>
  );
}

function Sparkline({ values, stroke }: { values: number[]; stroke: string }) {
  if (values.length < 2) {
    return <div aria-hidden className="h-8 w-24 opacity-40" />;
  }
  const w = 96;
  const h = 32;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const step = w / (values.length - 1);
  const points = values
    .map((v, i) => {
      const x = i * step;
      const y = h - ((v - min) / range) * h;
      return `${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(" ");
  return (
    <svg
      width={w}
      height={h}
      viewBox={`0 0 ${w} ${h}`}
      aria-hidden
      className="shrink-0"
    >
      <polyline
        points={points}
        fill="none"
        stroke={stroke}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
