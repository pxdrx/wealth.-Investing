"use client";

import { FlaskConical, Calendar, BarChart3, TrendingUp, TrendingDown, Target, Timer } from "lucide-react";
import { AnimatedSection } from "./AnimatedSection";
import { BACKTEST_SECTION } from "@/lib/landing-data";

const iconMap: Record<string, React.ComponentType<{ className?: string; style?: React.CSSProperties }>> = {
  "flask-conical": FlaskConical,
  calendar: Calendar,
  "bar-chart-3": BarChart3,
};

function KpiCard({ label, value, change, positive }: { label: string; value: string; change: string; positive: boolean }) {
  return (
    <div
      className="rounded-xl px-3.5 py-3 border"
      style={{
        backgroundColor: "hsl(var(--landing-bg-elevated))",
        borderColor: "hsl(var(--landing-border))",
      }}
    >
      <p className="font-mono text-[9px] uppercase tracking-wider text-l-text-muted mb-1">{label}</p>
      <div className="flex items-end gap-2">
        <span className="text-lg font-bold text-l-text">{value}</span>
        <span className={`flex items-center gap-0.5 font-mono text-[10px] font-semibold mb-0.5 ${positive ? "text-green-500" : "text-red-400"}`}>
          {positive ? <TrendingUp className="h-2.5 w-2.5" /> : <TrendingDown className="h-2.5 w-2.5" />}
          {change}
        </span>
      </div>
    </div>
  );
}

function CalendarDay({ day, pnl, isWin }: { day: number; pnl: string; isWin: boolean | null }) {
  return (
    <div
      className="flex flex-col items-center justify-center rounded-lg p-1.5 min-w-[36px]"
      style={{
        backgroundColor:
          isWin === null
            ? "hsl(var(--landing-bg-tertiary))"
            : isWin
              ? "hsla(142, 70%, 45%, 0.12)"
              : "hsla(0, 70%, 50%, 0.12)",
      }}
    >
      <span className="font-mono text-[9px] text-l-text-muted">{day}</span>
      {isWin !== null && (
        <span className={`font-mono text-[9px] font-bold ${isWin ? "text-green-500" : "text-red-400"}`}>
          {pnl}
        </span>
      )}
    </div>
  );
}

function QuickTradeRow({ symbol, direction, rr, result }: { symbol: string; direction: "long" | "short"; rr: string; result: "win" | "loss" }) {
  return (
    <div
      className="flex items-center gap-3 py-2.5 border-b last:border-b-0"
      style={{ borderColor: "hsl(var(--landing-border))" }}
    >
      <div className="flex items-center gap-1.5">
        {direction === "long" ? (
          <TrendingUp className="h-3 w-3 text-green-500" />
        ) : (
          <TrendingDown className="h-3 w-3 text-red-400" />
        )}
        <span className="font-mono text-[11px] font-semibold text-l-text">{symbol}</span>
      </div>
      <span className="font-mono text-[10px] text-l-text-muted ml-auto">{rr}</span>
      <span
        className={`font-mono text-[9px] font-bold px-1.5 py-0.5 rounded ${
          result === "win" ? "text-green-500 bg-green-500/10" : "text-red-400 bg-red-400/10"
        }`}
      >
        {result === "win" ? "WIN" : "LOSS"}
      </span>
    </div>
  );
}

export function BacktestLandingSection() {
  return (
    <section className="landing-section relative" aria-label="Backtesting">
      <div className="landing-container relative">
        <AnimatedSection className="text-center max-w-3xl mx-auto mb-14">
          <span className="inline-block font-mono text-xs tracking-[0.15em] uppercase text-l-text-muted mb-4">
            [{BACKTEST_SECTION.number}] {BACKTEST_SECTION.label}
          </span>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tighter-apple text-l-text mb-4">
            {BACKTEST_SECTION.headline}
          </h2>
          <p className="text-base leading-relaxed text-l-text-secondary">
            {BACKTEST_SECTION.description}
          </p>
        </AnimatedSection>

        <div className="grid gap-6 lg:grid-cols-[7fr_5fr]">
          {/* KPIs + Calendar */}
          <AnimatedSection>
            <div className="landing-card p-5 h-full">
              {/* Strategy header */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div
                    className="flex h-8 w-8 items-center justify-center rounded-xl"
                    style={{ backgroundColor: "hsla(270, 70%, 60%, 0.12)" }}
                  >
                    <FlaskConical className="h-4 w-4" style={{ color: "hsl(270, 70%, 60%)" }} />
                  </div>
                  <div>
                    <span className="text-xs font-semibold text-l-text">ICT Silver Bullet</span>
                    <div className="flex items-center gap-1">
                      <Timer className="h-2.5 w-2.5 text-l-text-muted" />
                      <span className="font-mono text-[9px] text-l-text-muted">32 trades simulados</span>
                    </div>
                  </div>
                </div>
                <span
                  className="font-mono text-[9px] font-medium px-2 py-1 rounded-lg"
                  style={{ backgroundColor: "hsla(270, 70%, 60%, 0.1)", color: "hsl(270, 70%, 60%)" }}
                >
                  BACKTEST
                </span>
              </div>

              {/* KPI grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-5">
                <KpiCard label="Win Rate" value="68%" change="+4%" positive={true} />
                <KpiCard label="Profit Factor" value="2.1" change="+0.3" positive={true} />
                <KpiCard label="Max DD" value="-3.2%" change="-0.5%" positive={false} />
                <KpiCard label="RR Médio" value="1:2.4" change="+0.2" positive={true} />
              </div>

              {/* Mini calendar heatmap */}
              <div className="mb-2">
                <div className="flex items-center gap-2 mb-3">
                  <Calendar className="h-3.5 w-3.5 text-l-text-muted" />
                  <span className="font-mono text-[10px] tracking-[0.1em] uppercase text-l-text-muted">
                    Março 2026
                  </span>
                </div>
                <div className="flex gap-1.5 overflow-x-auto pb-1">
                  <CalendarDay day={17} pnl="+$240" isWin={true} />
                  <CalendarDay day={18} pnl="-$80" isWin={false} />
                  <CalendarDay day={19} pnl="+$180" isWin={true} />
                  <CalendarDay day={20} pnl="+$320" isWin={true} />
                  <CalendarDay day={21} pnl="" isWin={null} />
                  <CalendarDay day={22} pnl="" isWin={null} />
                  <CalendarDay day={23} pnl="+$150" isWin={true} />
                  <CalendarDay day={24} pnl="-$60" isWin={false} />
                  <CalendarDay day={25} pnl="+$410" isWin={true} />
                  <CalendarDay day={26} pnl="+$90" isWin={true} />
                </div>
              </div>
            </div>
          </AnimatedSection>

          {/* Recent trades + feature bullets */}
          <div className="flex flex-col gap-6">
            <AnimatedSection delay={0.1}>
              <div className="landing-card p-5">
                <div className="flex items-center gap-2 mb-4">
                  <Target className="h-4 w-4 text-l-text-muted" />
                  <span className="font-mono text-[11px] tracking-[0.1em] uppercase text-l-text-muted">
                    Trades Recentes
                  </span>
                </div>
                <div className="space-y-0">
                  <QuickTradeRow symbol="EURUSD" direction="long" rr="1:3.2" result="win" />
                  <QuickTradeRow symbol="GBPUSD" direction="short" rr="1:1.8" result="win" />
                  <QuickTradeRow symbol="XAUUSD" direction="long" rr="1:2.5" result="loss" />
                  <QuickTradeRow symbol="NAS100" direction="long" rr="1:4.0" result="win" />
                </div>
              </div>
            </AnimatedSection>

            <AnimatedSection delay={0.2}>
              <div className="landing-card p-5">
                <div className="space-y-3">
                  {BACKTEST_SECTION.features.map((feat) => {
                    const Icon = iconMap[feat.icon] || FlaskConical;
                    return (
                      <div key={feat.title} className="flex gap-3">
                        <div
                          className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg"
                          style={{ backgroundColor: "hsla(270, 70%, 60%, 0.12)" }}
                        >
                          <Icon className="h-3.5 w-3.5" style={{ color: "hsl(270, 70%, 60%)" }} />
                        </div>
                        <div>
                          <h3 className="text-sm font-semibold text-l-text">{feat.title}</h3>
                          <p className="mt-0.5 text-[11px] leading-relaxed text-l-text-muted">
                            {feat.description}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </AnimatedSection>
          </div>
        </div>
      </div>
    </section>
  );
}
