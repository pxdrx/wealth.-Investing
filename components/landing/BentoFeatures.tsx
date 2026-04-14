import {
  BookOpen,
  Sparkles,
  CalendarClock,
  Brain,
  History,
  Shield,
  GraduationCap,
} from "lucide-react";
import type { ReactNode } from "react";

type Cell = {
  icon: ReactNode;
  title: string;
  body: string;
  className: string;
  dark?: boolean;
  visual?: ReactNode;
};

function JournalVisual() {
  return (
    <div className="mt-6 rounded-xl bg-zinc-800/60 border border-zinc-700/60 p-4">
      <div className="grid grid-cols-3 gap-2 mb-3">
        <div className="rounded-lg bg-zinc-900/70 border border-zinc-700/40 px-3 py-2">
          <div className="text-[9px] uppercase tracking-wider text-zinc-500">Net PnL</div>
          <div className="text-[15px] font-semibold text-emerald-400 mt-0.5">+$4.280</div>
        </div>
        <div className="rounded-lg bg-zinc-900/70 border border-zinc-700/40 px-3 py-2">
          <div className="text-[9px] uppercase tracking-wider text-zinc-500">Win rate</div>
          <div className="text-[15px] font-semibold text-white mt-0.5">62%</div>
        </div>
        <div className="rounded-lg bg-zinc-900/70 border border-zinc-700/40 px-3 py-2">
          <div className="text-[9px] uppercase tracking-wider text-zinc-500">Trades</div>
          <div className="text-[15px] font-semibold text-white mt-0.5">147</div>
        </div>
      </div>
      <div className="rounded-lg bg-zinc-900/70 border border-zinc-700/40 p-3">
        <div className="text-[9px] uppercase tracking-wider text-zinc-500 mb-1">
          Equity curve · últimos 30 dias
        </div>
        <svg viewBox="0 0 400 110" preserveAspectRatio="none" className="w-full h-[90px]">
          <defs>
            <linearGradient id="bentoJ" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#34d399" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#34d399" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path
            d="M 0 85 L 30 78 L 60 82 L 90 65 L 120 70 L 150 52 L 180 56 L 210 38 L 240 42 L 270 28 L 300 32 L 330 18 L 360 22 L 400 12 L 400 110 L 0 110 Z"
            fill="url(#bentoJ)"
          />
          <path
            d="M 0 85 L 30 78 L 60 82 L 90 65 L 120 70 L 150 52 L 180 56 L 210 38 L 240 42 L 270 28 L 300 32 L 330 18 L 360 22 L 400 12"
            stroke="#34d399"
            strokeWidth="1.8"
            fill="none"
          />
        </svg>
      </div>
      <div className="mt-3 flex items-center gap-2 text-[10px] text-zinc-500">
        <span className="inline-flex items-center gap-1 rounded-full bg-zinc-900/70 border border-zinc-700/40 px-2 py-0.5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> MT5
        </span>
        <span className="inline-flex items-center gap-1 rounded-full bg-zinc-900/70 border border-zinc-700/40 px-2 py-0.5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> MT4
        </span>
        <span className="inline-flex items-center gap-1 rounded-full bg-zinc-900/70 border border-zinc-700/40 px-2 py-0.5">
          XLSX · HTML
        </span>
      </div>
    </div>
  );
}

function BacktestVisual() {
  return (
    <div className="mt-4 grid grid-cols-3 gap-2">
      <div className="rounded-lg bg-muted/40 border border-border px-3 py-2">
        <div className="text-[9px] uppercase tracking-wider text-muted-foreground/70">Retorno</div>
        <div className="text-[14px] font-semibold text-emerald-600 mt-0.5">+34.2%</div>
      </div>
      <div className="rounded-lg bg-muted/40 border border-border px-3 py-2">
        <div className="text-[9px] uppercase tracking-wider text-muted-foreground/70">Acerto</div>
        <div className="text-[14px] font-semibold text-foreground mt-0.5">62%</div>
      </div>
      <div className="rounded-lg bg-muted/40 border border-border px-3 py-2">
        <div className="text-[9px] uppercase tracking-wider text-muted-foreground/70">Drawdown</div>
        <div className="text-[14px] font-semibold text-red-600 mt-0.5">-4.1%</div>
      </div>
    </div>
  );
}

const CELLS: Cell[] = [
  {
    icon: <BookOpen className="w-5 h-5" />,
    title: "Journal automatizado",
    body: "Importe MT5 e MT4 em segundos. PnL real, taxa de acerto e curva de capital — sem planilha e sem copiar trade por trade.",
    className: "lg:col-span-2 lg:row-span-2",
    dark: true,
    visual: <JournalVisual />,
  },
  {
    icon: <Sparkles className="w-5 h-5" />,
    title: "IA Coach",
    body: "Insights automáticos sobre seus padrões — melhor setup, alertas e sugestões personalizadas.",
    className: "",
  },
  {
    icon: <CalendarClock className="w-5 h-5" />,
    title: "Macroeconomia",
    body: "Calendário com CPI, NFP, decisões de juros e impacto por notícia — em um só lugar.",
    className: "",
  },
  {
    icon: <Brain className="w-5 h-5" />,
    title: "Dexter",
    body: "Analista que faz análise dos fundamentos até a tese final do ativo que você escolher.",
    className: "",
  },
  {
    icon: <History className="w-5 h-5" />,
    title: "Backtest",
    body: "Teste estratégias com dados reais. Retorno, taxa de acerto e drawdown — direto e sem jargão.",
    className: "lg:col-span-2",
    visual: <BacktestVisual />,
  },
  {
    icon: <Shield className="w-5 h-5" />,
    title: "Risk / Prop firms",
    body: "Drawdown diário e total, profit target, dias operados. Alertas antes de quebrar regra.",
    className: "",
  },
  {
    icon: <GraduationCap className="w-5 h-5" />,
    title: "Mentor",
    body: "Acompanhe seus alunos. PnL, taxa de acerto e status de cada um, com alertas automáticos.",
    className: "lg:col-span-2",
  },
];

export function BentoFeatures() {
  return (
    <section className="py-16 lg:py-24">
      <div className="mx-auto max-w-6xl px-6">
        <div className="mb-10 lg:mb-14 text-center lg:text-left">
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium mb-2">
            Funcionalidades
          </div>
          <h2 className="text-[28px] lg:text-[40px] font-semibold leading-tight tracking-tight text-foreground max-w-xl">
            Tudo que seu trading precisa.{" "}
            <span className="text-muted-foreground italic font-normal">Num lugar só.</span>
          </h2>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 lg:gap-4 lg:auto-rows-[minmax(180px,auto)]">
          {CELLS.map((c) => (
            <div
              key={c.title}
              className={
                "rounded-[22px] p-6 border flex flex-col " +
                (c.dark
                  ? "bg-zinc-900 text-white border-zinc-800"
                  : "bg-card text-foreground border-border") +
                " " +
                c.className
              }
            >
              <div
                className={
                  "w-9 h-9 rounded-lg flex items-center justify-center mb-4 " +
                  (c.dark ? "bg-zinc-800 text-zinc-300" : "bg-muted text-muted-foreground")
                }
              >
                {c.icon}
              </div>
              <h3 className="text-[16px] font-semibold mb-1.5 tracking-tight">{c.title}</h3>
              <p className={"text-[13px] leading-snug " + (c.dark ? "text-zinc-400" : "text-muted-foreground")}>
                {c.body}
              </p>
              {c.visual}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
