"use client";

import {
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  ArrowRight,
  Sparkles,
  AlertTriangle,
  CheckCircle,
  Bell,
  Shield,
} from "lucide-react";

/* ═══════════════════════════════════════════════════════════════
   REGISTRE — Import detail mockup
   ═══════════════════════════════════════════════════════════════ */
export function MockupImportDetail() {
  const trades = [
    { symbol: "EUR/USD", dir: "Long", pnl: "+R$480", r: "+1.8R", positive: true },
    { symbol: "GBP/JPY", dir: "Short", pnl: "-R$150", r: "-0.6R", positive: false },
    { symbol: "XAU/USD", dir: "Long", pnl: "+R$820", r: "+2.4R", positive: true },
    { symbol: "USD/CAD", dir: "Short", pnl: "+R$210", r: "+0.8R", positive: true },
    { symbol: "NAS100", dir: "Long", pnl: "-R$90", r: "-0.3R", positive: false },
    { symbol: "EUR/GBP", dir: "Long", pnl: "+R$340", r: "+1.2R", positive: true },
  ];

  return (
    <div className="p-5 md:p-8">
      {/* Top bar */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div
            className="h-8 w-8 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: "hsl(var(--landing-accent) / 0.1)" }}
          >
            <Upload className="h-4 w-4" style={{ color: "hsl(var(--landing-accent))" }} />
          </div>
          <div>
            <div className="text-sm font-semibold text-l-text">
              MT5_Statement_Mar2026.xlsx
            </div>
            <div className="text-xs text-l-text-muted">
              342 operações detectadas
            </div>
          </div>
        </div>
        <div
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-mono text-xs font-semibold"
          style={{
            backgroundColor: "hsl(152 40% 38% / 0.1)",
            color: "hsl(152 40% 38%)",
          }}
        >
          <CheckCircle2 className="h-3.5 w-3.5" />
          Importado
        </div>
      </div>

      {/* Progress steps */}
      <div className="flex items-center gap-2 mb-6">
        {["Upload", "Parsing", "Validação", "Concluído"].map((step, i) => (
          <div key={step} className="flex items-center gap-2 flex-1">
            <div
              className="h-6 w-6 rounded-full flex items-center justify-center font-mono text-[10px] font-bold shrink-0"
              style={{
                backgroundColor: "hsl(152 40% 38% / 0.15)",
                color: "hsl(152 40% 38%)",
              }}
            >
              {i + 1}
            </div>
            <span className="text-[10px] text-l-text-muted hidden sm:inline">
              {step}
            </span>
            {i < 3 && (
              <div
                className="flex-1 h-px hidden sm:block"
                style={{ backgroundColor: "hsl(152 40% 38% / 0.3)" }}
              />
            )}
          </div>
        ))}
      </div>

      {/* Trade table */}
      <div
        className="rounded-xl border overflow-hidden"
        style={{ borderColor: "hsl(var(--landing-border))" }}
      >
        {/* Table header */}
        <div
          className="grid grid-cols-4 gap-2 px-4 py-2 text-[10px] font-mono uppercase tracking-wider text-l-text-muted"
          style={{ backgroundColor: "hsl(var(--landing-bg-tertiary))" }}
        >
          <span>Símbolo</span>
          <span>Direção</span>
          <span className="text-right">P&L</span>
          <span className="text-right">R</span>
        </div>
        {/* Table rows */}
        {trades.map((trade, i) => (
          <div
            key={i}
            className="grid grid-cols-4 gap-2 px-4 py-2.5 border-t text-xs"
            style={{ borderColor: "hsl(var(--landing-border))" }}
          >
            <span className="font-medium text-l-text">{trade.symbol}</span>
            <span className="text-l-text-muted">{trade.dir}</span>
            <span
              className="text-right font-mono font-semibold"
              style={{
                color: trade.positive
                  ? "hsl(var(--pnl-text-positive))"
                  : "hsl(var(--pnl-text-negative))",
              }}
            >
              {trade.pnl}
            </span>
            <span
              className="text-right font-mono font-semibold"
              style={{
                color: trade.positive
                  ? "hsl(var(--pnl-text-positive))"
                  : "hsl(var(--pnl-text-negative))",
              }}
            >
              {trade.r}
            </span>
          </div>
        ))}
      </div>

      {/* Summary */}
      <div className="flex items-center justify-between mt-4 text-xs text-l-text-muted">
        <span>Mostrando 6 de 342 operações</span>
        <span className="font-mono font-semibold" style={{ color: "hsl(152 40% 38%)" }}>
          0 duplicadas detectadas
        </span>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   ANALISE — Analytics detail mockup
   ═══════════════════════════════════════════════════════════════ */
export function MockupAnalyticsDetail() {
  const weeklyPnl = [320, -150, 480, 210, -80, 560, 340, -120, 290, 180, -60, 450];
  const max = Math.max(...weeklyPnl.map(Math.abs));

  return (
    <div className="p-5 md:p-8">
      {/* KPI row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
        {[
          { label: "P&L Mensal", value: "+R$4.280", positive: true },
          { label: "Win Rate", value: "68.4%", positive: true },
          { label: "Profit Factor", value: "2.14", positive: true },
          { label: "Expectancy", value: "+R$82/trade", positive: true },
        ].map((kpi) => (
          <div
            key={kpi.label}
            className="rounded-xl border px-4 py-3"
            style={{
              backgroundColor: "hsl(var(--landing-bg-tertiary))",
              borderColor: "hsl(var(--landing-border))",
            }}
          >
            <div className="font-mono text-[9px] text-l-text-muted uppercase tracking-wider mb-1">
              {kpi.label}
            </div>
            <div
              className="font-mono text-lg font-bold"
              style={{
                color: kpi.positive
                  ? "hsl(var(--pnl-text-positive))"
                  : "hsl(var(--landing-text))",
              }}
            >
              {kpi.value}
            </div>
          </div>
        ))}
      </div>

      {/* Chart area */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* P&L bars */}
        <div>
          <div className="font-mono text-[9px] text-l-text-muted uppercase tracking-wider mb-3">
            P&L por Dia (últimos 12 dias)
          </div>
          <div
            className="rounded-xl border p-4"
            style={{
              backgroundColor: "hsl(var(--landing-bg-tertiary))",
              borderColor: "hsl(var(--landing-border))",
            }}
          >
            <div className="flex items-end gap-1.5 h-24">
              {weeklyPnl.map((v, i) => (
                <div
                  key={i}
                  className="flex-1 flex flex-col items-center justify-end h-full"
                >
                  <div
                    className="w-full rounded-t-sm min-h-[2px]"
                    style={{
                      height: `${(Math.abs(v) / max) * 100}%`,
                      backgroundColor:
                        v >= 0
                          ? "hsl(var(--landing-accent) / 0.6)"
                          : "hsl(var(--landing-accent-danger) / 0.5)",
                    }}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Calendar mini */}
        <div>
          <div className="font-mono text-[9px] text-l-text-muted uppercase tracking-wider mb-3">
            Calendário Heatmap
          </div>
          <div
            className="rounded-xl border p-4"
            style={{
              backgroundColor: "hsl(var(--landing-bg-tertiary))",
              borderColor: "hsl(var(--landing-border))",
            }}
          >
            {/* Day headers */}
            <div className="grid grid-cols-5 gap-1.5 mb-1.5">
              {["Seg", "Ter", "Qua", "Qui", "Sex"].map((d) => (
                <div
                  key={d}
                  className="text-center font-mono text-[8px] text-l-text-muted"
                >
                  {d}
                </div>
              ))}
            </div>
            {/* Calendar cells */}
            <div className="grid grid-cols-5 gap-1.5">
              {[
                280, -150, 320, 0, 180, -90, 450, 120, -200, 340, 160, 0, -80,
                520, 210, 380, -120, 0, 290, -60,
              ].map((v, i) => {
                let bg = "hsl(var(--landing-border) / 0.5)";
                if (v > 200) bg = "hsl(var(--pnl-cell-win))";
                else if (v > 0) bg = "hsl(152 32% 55% / 0.10)";
                else if (v < -100) bg = "hsl(var(--pnl-cell-loss))";
                else if (v < 0) bg = "hsl(4 45% 55% / 0.10)";
                return (
                  <div
                    key={i}
                    className="aspect-square rounded-md"
                    style={{ backgroundColor: bg }}
                  />
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Extra metrics row */}
      <div className="grid grid-cols-3 gap-3 mt-6">
        {[
          { label: "RR Médio", value: "1.8", sub: "avg win / avg loss" },
          { label: "Maior Streak", value: "7 wins", sub: "consecutivas" },
          { label: "Trades/Dia", value: "4.2", sub: "média mensal" },
        ].map((m) => (
          <div
            key={m.label}
            className="rounded-xl border px-3 py-2.5 text-center"
            style={{
              backgroundColor: "hsl(var(--landing-bg-tertiary))",
              borderColor: "hsl(var(--landing-border))",
            }}
          >
            <div className="font-mono text-[9px] text-l-text-muted uppercase tracking-wider">
              {m.label}
            </div>
            <div
              className="font-mono text-base font-bold"
              style={{ color: "hsl(var(--landing-accent))" }}
            >
              {m.value}
            </div>
            <div className="font-mono text-[8px] text-l-text-muted">
              {m.sub}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   EVOLUA — Journal detail mockup
   ═══════════════════════════════════════════════════════════════ */
export function MockupJournalDetail() {
  return (
    <div className="p-5 md:p-8">
      <div className="grid md:grid-cols-2 gap-6">
        {/* Left: Trade list */}
        <div>
          <div className="font-mono text-[9px] text-l-text-muted uppercase tracking-wider mb-3">
            Operações do Dia — 18 Mar 2026
          </div>
          <div className="space-y-2.5">
            {[
              {
                symbol: "EUR/USD",
                setup: "Order Block",
                pnl: "+R$480",
                r: "+1.8R",
                rating: 9,
                positive: true,
              },
              {
                symbol: "GBP/JPY",
                setup: "Break & Retest",
                pnl: "-R$150",
                r: "-0.6R",
                rating: 5,
                positive: false,
              },
              {
                symbol: "XAU/USD",
                setup: "FVG Fill",
                pnl: "+R$820",
                r: "+2.4R",
                rating: 10,
                positive: true,
              },
            ].map((trade, i) => (
              <div
                key={i}
                className="rounded-xl border p-3.5"
                style={{
                  backgroundColor: "hsl(var(--landing-bg-tertiary))",
                  borderColor: "hsl(var(--landing-border))",
                }}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div
                      className="h-1.5 w-1.5 rounded-full"
                      style={{
                        backgroundColor: trade.positive
                          ? "hsl(152 40% 38%)"
                          : "hsl(4 50% 52%)",
                      }}
                    />
                    <span className="font-mono text-xs font-semibold text-l-text">
                      {trade.symbol}
                    </span>
                    <span
                      className="px-1.5 py-0.5 rounded font-mono text-[9px]"
                      style={{
                        backgroundColor: "hsl(var(--landing-accent) / 0.08)",
                        color: "hsl(var(--landing-text-secondary))",
                      }}
                    >
                      {trade.setup}
                    </span>
                  </div>
                  <span
                    className="font-mono text-xs font-bold"
                    style={{
                      color: trade.positive
                        ? "hsl(var(--pnl-text-positive))"
                        : "hsl(var(--pnl-text-negative))",
                    }}
                  >
                    {trade.pnl}
                  </span>
                </div>
                <div className="flex items-center justify-between text-[10px]">
                  <span className="text-l-text-muted">
                    Execução: {trade.rating}/10
                  </span>
                  <span
                    className="font-mono"
                    style={{
                      color: trade.positive
                        ? "hsl(var(--pnl-text-positive))"
                        : "hsl(var(--pnl-text-negative))",
                    }}
                  >
                    {trade.r}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: AI Coach */}
        <div>
          <div className="font-mono text-[9px] text-l-text-muted uppercase tracking-wider mb-3 flex items-center gap-1.5">
            <Sparkles
              className="h-3 w-3"
              style={{ color: "hsl(var(--landing-accent))" }}
            />
            AI COACH — Análise do Dia
          </div>
          <div
            className="rounded-xl border p-4"
            style={{
              backgroundColor: "hsl(var(--landing-accent) / 0.03)",
              borderColor: "hsl(var(--landing-accent) / 0.12)",
            }}
          >
            <div className="space-y-3 text-xs text-l-text-secondary leading-relaxed">
              <p>
                <span className="font-semibold text-l-text">Resumo:</span> Dia
                positivo com +R$1.150 em 3 trades. Execução consistente.
              </p>
              <p>
                <span className="font-semibold text-l-text">Destaque:</span> Seu
                trade em XAU/USD (FVG Fill) teve execução nota 10. Esse setup tem
                82% de win rate no seu histórico.
              </p>
              <p>
                <span className="font-semibold text-l-text">Atenção:</span> O
                trade em GBP/JPY (Break & Retest) foi o mais fraco. Esse setup
                tem apenas 45% de WR no seu histórico. Considere reduzir
                alocação.
              </p>
              <p>
                <span className="font-semibold text-l-text">Padrão:</span>{" "}
                Você tem performado melhor na sessão de London (78% WR) vs. NY
                (52% WR). Considere focar na London.
              </p>
            </div>
          </div>

          {/* Daily note */}
          <div
            className="rounded-xl border p-4 mt-3"
            style={{
              backgroundColor: "hsl(var(--landing-bg-tertiary))",
              borderColor: "hsl(var(--landing-border))",
            }}
          >
            <div className="font-mono text-[9px] text-l-text-muted uppercase tracking-wider mb-2">
              Observação do Dia
            </div>
            <p className="text-xs text-l-text-secondary leading-relaxed italic">
              &quot;Dia focado, respeitei o plano. Única falha foi insistir no
              Break & Retest em GBP/JPY que não tinha confluência suficiente.
              Preciso ser mais seletivo com esse setup.&quot;
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   PROTEJA — Risk detail mockup
   ═══════════════════════════════════════════════════════════════ */
export function MockupRiskDetail() {
  return (
    <div className="p-5 md:p-8">
      <div className="grid md:grid-cols-2 gap-6">
        {/* Left: Account cards */}
        <div className="space-y-4">
          <div className="font-mono text-[9px] text-l-text-muted uppercase tracking-wider mb-1">
            Contas Monitoradas
          </div>

          {[
            {
              name: "FTMO 100k",
              phase: "Verificação",
              ddDaily: 4.2,
              ddDailyMax: 5,
              ddTotal: 6.1,
              ddTotalMax: 10,
              profit: 8200,
              target: 10000,
              status: "warning",
            },
            {
              name: "The5ers 100k",
              phase: "Funded",
              ddDaily: 1.8,
              ddDailyMax: 4,
              ddTotal: 3.2,
              ddTotalMax: 6,
              profit: 4500,
              target: null,
              status: "safe",
            },
          ].map((account) => (
            <div
              key={account.name}
              className="rounded-xl border p-4"
              style={{
                backgroundColor: "hsl(var(--landing-bg-tertiary))",
                borderColor: "hsl(var(--landing-border))",
              }}
            >
              <div className="flex items-center justify-between mb-3">
                <div>
                  <div className="font-mono text-xs font-semibold text-l-text">
                    {account.name}
                  </div>
                  <div className="font-mono text-[10px] text-l-text-muted">
                    {account.phase}
                  </div>
                </div>
                <Shield
                  className="h-4 w-4"
                  style={{
                    color:
                      account.status === "safe"
                        ? "hsl(152 40% 38%)"
                        : "hsl(38 80% 48%)",
                  }}
                />
              </div>

              {/* DD Daily */}
              <div className="mb-2.5">
                <div className="flex justify-between text-[10px] mb-1">
                  <span className="text-l-text-muted">DD Diário</span>
                  <span className="font-mono font-semibold text-l-text">
                    {account.ddDaily}% / {account.ddDailyMax}%
                  </span>
                </div>
                <div
                  className="h-2 rounded-full overflow-hidden"
                  style={{ backgroundColor: "hsl(var(--landing-border))" }}
                >
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${(account.ddDaily / account.ddDailyMax) * 100}%`,
                      backgroundColor:
                        account.ddDaily / account.ddDailyMax > 0.8
                          ? "hsl(38 80% 48%)"
                          : "hsl(152 40% 38%)",
                    }}
                  />
                </div>
              </div>

              {/* DD Total */}
              <div className="mb-2.5">
                <div className="flex justify-between text-[10px] mb-1">
                  <span className="text-l-text-muted">DD Total</span>
                  <span className="font-mono font-semibold text-l-text">
                    {account.ddTotal}% / {account.ddTotalMax}%
                  </span>
                </div>
                <div
                  className="h-2 rounded-full overflow-hidden"
                  style={{ backgroundColor: "hsl(var(--landing-border))" }}
                >
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${(account.ddTotal / account.ddTotalMax) * 100}%`,
                      backgroundColor: "hsl(152 40% 38%)",
                    }}
                  />
                </div>
              </div>

              {/* Profit progress */}
              {account.target && (
                <div>
                  <div className="flex justify-between text-[10px] mb-1">
                    <span className="text-l-text-muted">Meta de Lucro</span>
                    <span
                      className="font-mono font-semibold"
                      style={{ color: "hsl(var(--landing-accent))" }}
                    >
                      R${account.profit.toLocaleString()} / R$
                      {account.target.toLocaleString()}
                    </span>
                  </div>
                  <div
                    className="h-2 rounded-full overflow-hidden"
                    style={{ backgroundColor: "hsl(var(--landing-border))" }}
                  >
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${(account.profit / account.target) * 100}%`,
                        backgroundColor: "hsl(var(--landing-accent))",
                      }}
                    />
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Right: Alerts & rules */}
        <div>
          <div className="font-mono text-[9px] text-l-text-muted uppercase tracking-wider mb-3">
            Alertas Recentes
          </div>
          <div className="space-y-2 mb-6">
            {[
              {
                Icon: AlertTriangle,
                text: "FTMO: DD diário em 84% do limite",
                time: "14:32",
                color: "hsl(38 80% 48%)",
              },
              {
                Icon: CheckCircle,
                text: "Meta diária atingida: +R$1.240",
                time: "13:15",
                color: "hsl(152 40% 38%)",
              },
              {
                Icon: Bell,
                text: "The5ers: 6/8 trades máximos hoje",
                time: "11:48",
                color: "hsl(var(--landing-accent))",
              },
              {
                Icon: AlertTriangle,
                text: "FTMO: Loss streak (3 perdas seguidas)",
                time: "10:22",
                color: "hsl(var(--landing-accent-danger))",
              },
            ].map((alert, i) => (
              <div
                key={i}
                className="flex items-center gap-2.5 rounded-xl border px-3 py-2.5"
                style={{
                  backgroundColor: "hsl(var(--landing-bg-tertiary))",
                  borderColor: "hsl(var(--landing-border))",
                }}
              >
                <alert.Icon
                  className="h-3.5 w-3.5 shrink-0"
                  style={{ color: alert.color }}
                />
                <div className="flex-1 min-w-0">
                  <span className="text-[11px] text-l-text block truncate">
                    {alert.text}
                  </span>
                </div>
                <span className="font-mono text-[9px] text-l-text-muted shrink-0">
                  {alert.time}
                </span>
              </div>
            ))}
          </div>

          <div className="font-mono text-[9px] text-l-text-muted uppercase tracking-wider mb-3">
            Regras Configuradas
          </div>
          <div
            className="rounded-xl border p-4 space-y-2.5"
            style={{
              backgroundColor: "hsl(var(--landing-bg-tertiary))",
              borderColor: "hsl(var(--landing-border))",
            }}
          >
            {[
              { rule: "DD Diário máximo", value: "5%" },
              { rule: "DD Total máximo", value: "10%" },
              { rule: "Trades por dia", value: "8" },
              { rule: "Meta diária", value: "+R$1.000" },
              { rule: "Loss streak alerta", value: "3 consecutivas" },
            ].map((r) => (
              <div
                key={r.rule}
                className="flex items-center justify-between text-[11px]"
              >
                <span className="text-l-text-muted">{r.rule}</span>
                <span className="font-mono font-semibold text-l-text">
                  {r.value}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
