"use client";

import {
  FileSpreadsheet,
  Upload,
  Layers,
  BarChart3,
  Calendar,
  TrendingUp,
  Pencil,
  Brain,
  Shield,
  AlertTriangle,
  Search,
  FileText,
  Sparkles,
  FlaskConical,
  Target,
} from "lucide-react";

/* ═══════════════════════════════════════════════════════════════
   REGISTRE checklist visual
   ═══════════════════════════════════════════════════════════════ */
export function ChecklistImport() {
  const platforms = [
    { name: "MetaTrader 5", format: "XLSX / HTML", icon: "MT5" },
    { name: "cTrader", format: "CSV", icon: "cT" },
    { name: "MetaTrader 4", format: "HTML", icon: "MT4" },
    { name: "CSV Genérico", format: "CSV", icon: "CSV" },
  ];

  return (
    <div
      className="rounded-[22px] border p-5"
      style={{
        backgroundColor: "hsl(var(--landing-bg-elevated))",
        borderColor: "hsl(var(--landing-border))",
        boxShadow: "var(--landing-card-shadow)",
      }}
    >
      <div className="font-mono text-[9px] text-l-text-muted uppercase tracking-wider mb-4">
        Plataformas Suportadas
      </div>
      <div className="grid grid-cols-2 gap-2.5">
        {platforms.map((p) => (
          <div
            key={p.name}
            className="rounded-xl border px-3 py-3 flex items-center gap-3"
            style={{
              backgroundColor: "hsl(var(--landing-bg-tertiary))",
              borderColor: "hsl(var(--landing-border))",
            }}
          >
            <div
              className="h-8 w-8 rounded-lg flex items-center justify-center font-mono text-[10px] font-bold shrink-0"
              style={{
                backgroundColor: "hsl(var(--landing-accent) / 0.1)",
                color: "hsl(var(--landing-accent))",
              }}
            >
              {p.icon}
            </div>
            <div>
              <div className="text-xs font-medium text-l-text">{p.name}</div>
              <div className="text-[10px] text-l-text-muted">{p.format}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-3 gap-2 mt-4">
        {[
          { label: "Formatos", value: "4+" },
          { label: "Max Upload", value: "50MB" },
          { label: "Dedup", value: "Auto" },
        ].map((s) => (
          <div
            key={s.label}
            className="text-center rounded-lg py-2"
            style={{ backgroundColor: "hsl(var(--landing-bg-tertiary))" }}
          >
            <div
              className="font-mono text-sm font-bold"
              style={{ color: "hsl(var(--landing-accent))" }}
            >
              {s.value}
            </div>
            <div className="font-mono text-[8px] text-l-text-muted uppercase">
              {s.label}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   ANALISE checklist visual
   ═══════════════════════════════════════════════════════════════ */
export function ChecklistAnalytics() {
  return (
    <div
      className="rounded-[22px] border p-5"
      style={{
        backgroundColor: "hsl(var(--landing-bg-elevated))",
        borderColor: "hsl(var(--landing-border))",
        boxShadow: "var(--landing-card-shadow)",
      }}
    >
      <div className="font-mono text-[9px] text-l-text-muted uppercase tracking-wider mb-4">
        Métricas Disponíveis
      </div>
      <div className="grid grid-cols-2 gap-2">
        {[
          { icon: BarChart3, label: "P&L Total", value: "+R$4.280" },
          { icon: TrendingUp, label: "Win Rate", value: "68.4%" },
          { icon: BarChart3, label: "Profit Factor", value: "2.14" },
          { icon: TrendingUp, label: "Expectancy", value: "+R$82" },
          { icon: Calendar, label: "Trades/Dia", value: "4.2" },
          { icon: BarChart3, label: "RR Médio", value: "1.8" },
          { icon: TrendingUp, label: "Maior Win", value: "+R$1.240" },
          { icon: BarChart3, label: "Win Streak", value: "7" },
        ].map((m) => (
          <div
            key={m.label}
            className="flex items-center gap-2.5 rounded-lg px-3 py-2"
            style={{ backgroundColor: "hsl(var(--landing-bg-tertiary))" }}
          >
            <m.icon
              className="h-3.5 w-3.5 shrink-0"
              style={{ color: "hsl(var(--landing-accent))" }}
            />
            <div className="flex-1 min-w-0">
              <div className="text-[10px] text-l-text-muted truncate">
                {m.label}
              </div>
              <div className="font-mono text-xs font-semibold text-l-text">
                {m.value}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   EVOLUA checklist visual
   ═══════════════════════════════════════════════════════════════ */
export function ChecklistJournal() {
  return (
    <div
      className="rounded-[22px] border p-5"
      style={{
        backgroundColor: "hsl(var(--landing-bg-elevated))",
        borderColor: "hsl(var(--landing-border))",
        boxShadow: "var(--landing-card-shadow)",
      }}
    >
      <div className="font-mono text-[9px] text-l-text-muted uppercase tracking-wider mb-4">
        Ferramentas de Journaling
      </div>

      {/* Feature pills */}
      <div className="space-y-2.5">
        {[
          {
            Icon: Pencil,
            title: "Registro Contextual",
            desc: "Setup, emoção, execução, notas",
          },
          {
            Icon: Brain,
            title: "AI Coach",
            desc: "Feedback personalizado por IA",
          },
          {
            Icon: Calendar,
            title: "Observações Diárias",
            desc: "Notas no calendário com blue dots",
          },
        ].map((f) => (
          <div
            key={f.title}
            className="flex items-start gap-3 rounded-xl px-3 py-3"
            style={{ backgroundColor: "hsl(var(--landing-bg-tertiary))" }}
          >
            <div
              className="h-8 w-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
              style={{ backgroundColor: "hsl(var(--landing-accent) / 0.1)" }}
            >
              <f.Icon
                className="h-4 w-4"
                style={{ color: "hsl(var(--landing-accent))" }}
              />
            </div>
            <div>
              <div className="text-xs font-semibold text-l-text">{f.title}</div>
              <div className="text-[10px] text-l-text-muted">{f.desc}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Tags preview */}
      <div className="mt-4">
        <div className="font-mono text-[9px] text-l-text-muted uppercase tracking-wider mb-2">
          Tags Customizáveis
        </div>
        <div className="flex flex-wrap gap-1.5">
          {[
            "Order Block",
            "FVG Fill",
            "Break & Retest",
            "London",
            "New York",
            "Confiante",
            "Impaciente",
            "EUR/USD",
            "XAU/USD",
          ].map((tag) => (
            <span
              key={tag}
              className="inline-flex rounded-full px-2.5 py-1 font-mono text-[9px] font-medium"
              style={{
                backgroundColor: "hsl(var(--landing-accent) / 0.08)",
                color: "hsl(var(--landing-text-secondary))",
              }}
            >
              {tag}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   PROTEJA checklist visual
   ═══════════════════════════════════════════════════════════════ */
export function ChecklistRisk() {
  const firms = [
    { name: "FTMO", ddDaily: "5%", ddTotal: "10%", target: "10%" },
    { name: "The5ers", ddDaily: "4%", ddTotal: "6%", target: "8%" },
    { name: "MyFundedFX", ddDaily: "5%", ddTotal: "8%", target: "8%" },
  ];

  return (
    <div
      className="rounded-[22px] border p-5"
      style={{
        backgroundColor: "hsl(var(--landing-bg-elevated))",
        borderColor: "hsl(var(--landing-border))",
        boxShadow: "var(--landing-card-shadow)",
      }}
    >
      <div className="font-mono text-[9px] text-l-text-muted uppercase tracking-wider mb-4">
        Regras de Prop Firms
      </div>

      {/* Firm rules table */}
      <div
        className="rounded-xl border overflow-hidden mb-4"
        style={{ borderColor: "hsl(var(--landing-border))" }}
      >
        <div
          className="grid grid-cols-4 gap-1 px-3 py-2 text-[9px] font-mono uppercase tracking-wider text-l-text-muted"
          style={{ backgroundColor: "hsl(var(--landing-bg-tertiary))" }}
        >
          <span>Firma</span>
          <span className="text-center">DD Diário</span>
          <span className="text-center">DD Total</span>
          <span className="text-center">Meta</span>
        </div>
        {firms.map((firm) => (
          <div
            key={firm.name}
            className="grid grid-cols-4 gap-1 px-3 py-2.5 border-t text-[11px]"
            style={{ borderColor: "hsl(var(--landing-border))" }}
          >
            <span className="font-medium text-l-text">{firm.name}</span>
            <span className="text-center font-mono text-l-text-secondary">
              {firm.ddDaily}
            </span>
            <span className="text-center font-mono text-l-text-secondary">
              {firm.ddTotal}
            </span>
            <span className="text-center font-mono text-l-text-secondary">
              {firm.target}
            </span>
          </div>
        ))}
      </div>

      {/* Alert types */}
      <div className="font-mono text-[9px] text-l-text-muted uppercase tracking-wider mb-2">
        Tipos de Alerta
      </div>
      <div className="space-y-1.5">
        {[
          { Icon: AlertTriangle, label: "Drawdown próximo do limite", color: "hsl(38 80% 48%)" },
          { Icon: Shield, label: "Meta diária atingida", color: "hsl(152 40% 38%)" },
          { Icon: AlertTriangle, label: "Loss streak detectada", color: "hsl(var(--landing-accent-danger))" },
        ].map((a) => (
          <div
            key={a.label}
            className="flex items-center gap-2 rounded-lg px-3 py-2"
            style={{ backgroundColor: "hsl(var(--landing-bg-tertiary))" }}
          >
            <a.Icon className="h-3 w-3 shrink-0" style={{ color: a.color }} />
            <span className="text-[10px] text-l-text">{a.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   DEXTER checklist visual
   ═══════════════════════════════════════════════════════════════ */
export function ChecklistDexter() {
  return (
    <div
      className="rounded-[22px] border p-5"
      style={{
        backgroundColor: "hsl(var(--landing-bg-elevated))",
        borderColor: "hsl(var(--landing-border))",
        boxShadow: "var(--landing-card-shadow)",
      }}
    >
      <div className="font-mono text-[9px] text-l-text-muted uppercase tracking-wider mb-4">
        Capacidades do Dexter
      </div>

      {/* Feature pills */}
      <div className="space-y-2.5">
        {[
          {
            Icon: Search,
            title: "Research Autonomo",
            desc: "Pesquisa noticias, dados macro e precos em tempo real",
          },
          {
            Icon: Brain,
            title: "Memoria Persistente",
            desc: "Lembra de cada analise e evolui com o uso",
          },
          {
            Icon: FileText,
            title: "Relatórios Detalhados",
            desc: "Análise técnica, fundamental e macro integradas",
          },
          {
            Icon: Sparkles,
            title: "Insights Conectados",
            desc: "Cruza dados passados com analises atuais",
          },
        ].map((f) => (
          <div
            key={f.title}
            className="flex items-start gap-3 rounded-xl px-3 py-3"
            style={{ backgroundColor: "hsl(var(--landing-bg-tertiary))" }}
          >
            <div
              className="h-8 w-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
              style={{ backgroundColor: "hsl(var(--landing-accent) / 0.1)" }}
            >
              <f.Icon
                className="h-4 w-4"
                style={{ color: "hsl(var(--landing-accent))" }}
              />
            </div>
            <div>
              <div className="text-xs font-semibold text-l-text">{f.title}</div>
              <div className="text-[10px] text-l-text-muted">{f.desc}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-3 gap-2 mt-4">
        {[
          { label: "Ativos", value: "Todos" },
          { label: "Memoria", value: "∞" },
          { label: "Resposta", value: "< 10s" },
        ].map((s) => (
          <div
            key={s.label}
            className="text-center rounded-lg py-2"
            style={{ backgroundColor: "hsl(var(--landing-bg-tertiary))" }}
          >
            <div
              className="font-mono text-sm font-bold"
              style={{ color: "hsl(var(--landing-accent))" }}
            >
              {s.value}
            </div>
            <div className="font-mono text-[8px] text-l-text-muted uppercase">
              {s.label}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   BACKTEST checklist visual
   ═══════════════════════════════════════════════════════════════ */
export function ChecklistBacktest() {
  return (
    <div
      className="rounded-[22px] border p-5"
      style={{
        backgroundColor: "hsl(var(--landing-bg-elevated))",
        borderColor: "hsl(var(--landing-border))",
        boxShadow: "var(--landing-card-shadow)",
      }}
    >
      <div className="font-mono text-[9px] text-l-text-muted uppercase tracking-wider mb-4">
        Ferramentas de Backtesting
      </div>

      {/* Feature pills */}
      <div className="space-y-2.5">
        {[
          {
            Icon: FlaskConical,
            title: "Contas Isoladas",
            desc: "Uma conta por estrategia, dados separados",
          },
          {
            Icon: Calendar,
            title: "Calendario Heatmap",
            desc: "Visualize resultados dia a dia por estrategia",
          },
          {
            Icon: Target,
            title: "Trade Rapido",
            desc: "Formulario inline com botoes de ativo pre-configurados",
          },
        ].map((f) => (
          <div
            key={f.title}
            className="flex items-start gap-3 rounded-xl px-3 py-3"
            style={{ backgroundColor: "hsl(var(--landing-bg-tertiary))" }}
          >
            <div
              className="h-8 w-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
              style={{ backgroundColor: "hsl(var(--landing-accent) / 0.1)" }}
            >
              <f.Icon
                className="h-4 w-4"
                style={{ color: "hsl(var(--landing-accent))" }}
              />
            </div>
            <div>
              <div className="text-xs font-semibold text-l-text">{f.title}</div>
              <div className="text-[10px] text-l-text-muted">{f.desc}</div>
            </div>
          </div>
        ))}
      </div>

      {/* KPI preview */}
      <div className="grid grid-cols-2 gap-2 mt-4">
        {[
          { icon: BarChart3, label: "Win Rate", value: "67%" },
          { icon: TrendingUp, label: "Profit Factor", value: "1.8" },
          { icon: BarChart3, label: "Max DD", value: "-4.2%" },
          { icon: TrendingUp, label: "RR Medio", value: "1.6" },
        ].map((m) => (
          <div
            key={m.label}
            className="flex items-center gap-2.5 rounded-lg px-3 py-2"
            style={{ backgroundColor: "hsl(var(--landing-bg-tertiary))" }}
          >
            <m.icon
              className="h-3.5 w-3.5 shrink-0"
              style={{ color: "hsl(var(--landing-accent))" }}
            />
            <div className="flex-1 min-w-0">
              <div className="text-[10px] text-l-text-muted truncate">
                {m.label}
              </div>
              <div className="font-mono text-xs font-semibold text-l-text">
                {m.value}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
