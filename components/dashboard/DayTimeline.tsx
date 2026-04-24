"use client";

import { useEffect, useState } from "react";
import { safeGetSession } from "@/lib/supabase/safe-session";
import { useAppT } from "@/hooks/useAppLocale";
import { useActiveAccount } from "@/components/context/ActiveAccountContext";

interface TodayStats {
  pnl: { amount: number; currency: string; trades: number; winRate: number; sparkline: number[] };
  drawdown: { current: number | null; limit: number | null; propFirmName: string | null };
  mood: { state: string; confidence: number };
  trades: Array<{ id: string; timestamp: string; pnl: number; instrument: string; side: "long" | "short" }>;
  sessions: Array<{ market: string; openUtc: string; closeUtc: string }>;
  generatedAt: string;
}

type LoadState =
  | { kind: "loading" }
  | { kind: "success"; data: TodayStats }
  | { kind: "error" }
  | { kind: "idle" };

// Window: 08:00-22:00 BRT (14 hours) — anchored to "today" in BRT.
const START_HOUR = 8;
const END_HOUR = 22;
const HOURS = END_HOUR - START_HOUR;

const SESSION_FILL: Record<string, string> = {
  Tokyo: "rgba(236, 72, 153, 0.08)",
  Londres: "rgba(99, 102, 241, 0.10)",
  "Nova York": "rgba(59, 130, 246, 0.10)",
};

// Converts an ISO time into a fractional hour offset from START_HOUR (BRT).
function toOffsetHours(iso: string): number {
  const d = new Date(iso);
  const brtHours = d.getUTCHours() - 3 + d.getUTCMinutes() / 60;
  // Normalize negative (e.g. sessions crossing UTC midnight are rare here).
  const normalized = brtHours < 0 ? brtHours + 24 : brtHours;
  return normalized - START_HOUR;
}

export function DayTimeline() {
  const t = useAppT();
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

  return (
    <div
      className="rounded-xl border p-4 md:p-5 text-white overflow-hidden"
      style={{
        backgroundColor: "hsl(220 8% 10%)",
        borderColor: "hsl(220 6% 18%)",
      }}
    >
      <div className="mb-3 flex items-center justify-between">
        <p className="text-xs uppercase tracking-wider text-white/50">
          {t("dashboard.dayTimeline.title")}
        </p>
        <p className="text-[11px] text-white/30">
          {state.kind === "success"
            ? t("dashboard.dayTimeline.tradesCount").replace("{count}", String(state.data.trades.length))
            : ""}
        </p>
      </div>
      <Body state={state} t={t} />
    </div>
  );
}

function Body({ state, t }: { state: LoadState; t: (key: import("@/lib/i18n/app").AppMessageKey) => string }) {
  if (state.kind === "loading") {
    return <div className="h-[60px] md:h-[80px] w-full rounded-md bg-white/5 animate-pulse" />;
  }

  if (state.kind === "error" || state.kind === "idle") {
    return (
      <p className="py-6 text-center text-sm text-white/50">
        {/* TODO(A-02): replace with voice.ts copy */}
        {t("dashboard.dayTimeline.unavailable")}
      </p>
    );
  }

  const { trades, sessions } = state.data;

  if (trades.length === 0) {
    return (
      <div className="py-6 text-center">
        <p className="text-sm text-white/70">
          {/* TODO(A-02): replace with voice.ts copy */}
          {t("dayTimeline.none")}
        </p>
      </div>
    );
  }

  const maxAbsPnl = Math.max(1, ...trades.map((t) => Math.abs(t.pnl)));

  // Visible trades fall within the 08-22 window.
  const visibleTrades = trades
    .map((t) => ({ ...t, offset: toOffsetHours(t.timestamp) }))
    .filter((t) => t.offset >= 0 && t.offset <= HOURS);

  return (
    <div>
      <p className="mb-2 text-xs text-white/60">{t("dayTimeline.subtitle")}</p>
      <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-white/60">
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: "#34d399" }} />
          {t("dayTimeline.profit")}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: "#f87171" }} />
          {t("dayTimeline.loss")}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-2 w-3 rounded-sm bg-white/10" />
          {t("dayTimeline.session")}
        </span>
      </div>
      <div className="overflow-x-auto">
      <svg
        viewBox={`0 0 ${HOURS * 60} 80`}
        className="h-[60px] md:h-[80px] w-full min-w-[560px]"
        preserveAspectRatio="none"
      >
        {/* Session bands */}
        {sessions.map((s) => {
          const start = toOffsetHours(s.openUtc);
          const end = toOffsetHours(s.closeUtc);
          const x1 = Math.max(0, start) * 60;
          const x2 = Math.min(HOURS, end) * 60;
          if (x2 <= x1) return null;
          return (
            <rect
              key={s.market}
              x={x1}
              y={12}
              width={x2 - x1}
              height={56}
              fill={SESSION_FILL[s.market] ?? "rgba(255,255,255,0.05)"}
            >
              <title>{s.market}</title>
            </rect>
          );
        })}

        {/* Center line */}
        <line
          x1={0}
          x2={HOURS * 60}
          y1={40}
          y2={40}
          stroke="rgba(255,255,255,0.12)"
          strokeWidth={1}
        />

        {/* Hour ticks */}
        {Array.from({ length: HOURS + 1 }).map((_, i) => (
          <g key={i}>
            <line
              x1={i * 60}
              x2={i * 60}
              y1={36}
              y2={44}
              stroke="rgba(255,255,255,0.15)"
              strokeWidth={1}
            />
            {i % 2 === 0 && (
              <text
                x={i * 60}
                y={74}
                textAnchor="middle"
                fontSize={9}
                fill="rgba(255,255,255,0.35)"
              >
                {String(START_HOUR + i).padStart(2, "0")}h
              </text>
            )}
          </g>
        ))}

        {/* Trades */}
        {visibleTrades.map((t) => {
          const cx = t.offset * 60;
          const r = 3 + Math.min(7, (Math.abs(t.pnl) / maxAbsPnl) * 7);
          const fill = t.pnl >= 0 ? "#34d399" : "#f87171";
          const tooltip = `${t.instrument} ${t.side === "long" ? "LONG" : "SHORT"} · ${t.pnl >= 0 ? "+" : ""}${t.pnl.toFixed(2)} @ ${new Date(t.timestamp).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`;
          return (
            <circle
              key={t.id}
              cx={cx}
              cy={40}
              r={r}
              fill={fill}
              stroke="rgba(0,0,0,0.4)"
              strokeWidth={0.5}
              opacity={0.9}
            >
              <title>{tooltip}</title>
            </circle>
          );
        })}

        {/* TODO(c-03/c-04): macro event markers once macro_events schema lands */}
      </svg>
      </div>
    </div>
  );
}
