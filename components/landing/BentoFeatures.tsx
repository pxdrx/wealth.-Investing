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
};

const CELLS: Cell[] = [
  {
    icon: <BookOpen className="w-5 h-5" />,
    title: "Journal automatizado",
    body: "Importe MT5/MT4 em segundos. PnL real, win rate, equity curve — sem planilha.",
    className: "lg:col-span-2 lg:row-span-2",
    dark: true,
  },
  {
    icon: <Sparkles className="w-5 h-5" />,
    title: "IA Coach",
    body: "Insights automáticos sobre seus padrões — melhor setup, alertas e sugestões.",
    className: "",
  },
  {
    icon: <CalendarClock className="w-5 h-5" />,
    title: "Macroeconomia",
    body: "Calendário com CPI, NFP, decisões de juros e impacto por notícia.",
    className: "",
  },
  {
    icon: <Brain className="w-5 h-5" />,
    title: "Dexter",
    body: "Analista que faz análise basilar à topo da cadeia do ativo que você escolher.",
    className: "",
  },
  {
    icon: <History className="w-5 h-5" />,
    title: "Backtest",
    body: "Teste estratégias com dados reais. Sharpe, PF, max DD e calendário operacional.",
    className: "lg:col-span-2",
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
    body: "Acompanhe alunos, veja PnL, WR e status de cada um. Badges de atenção automáticos.",
    className: "lg:col-span-2",
  },
];

export function BentoFeatures() {
  return (
    <section className="py-16 lg:py-24">
      <div className="mx-auto max-w-6xl px-6">
        <div className="mb-10 lg:mb-14 text-center lg:text-left">
          <div className="text-[11px] uppercase tracking-wider text-zinc-500 font-medium mb-2">
            Funcionalidades
          </div>
          <h2 className="text-[28px] lg:text-[40px] font-semibold leading-tight tracking-tight text-zinc-900 max-w-xl">
            Tudo que seu trading precisa.{" "}
            <span className="text-zinc-500 italic font-normal">Num lugar só.</span>
          </h2>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 lg:gap-4">
          {CELLS.map((c) => (
            <div
              key={c.title}
              className={
                "rounded-[22px] p-6 border " +
                (c.dark
                  ? "bg-zinc-900 text-white border-zinc-800"
                  : "bg-white text-zinc-900 border-zinc-200") +
                " " +
                c.className
              }
            >
              <div
                className={
                  "w-9 h-9 rounded-lg flex items-center justify-center mb-4 " +
                  (c.dark ? "bg-zinc-800 text-zinc-300" : "bg-zinc-100 text-zinc-700")
                }
              >
                {c.icon}
              </div>
              <h3 className="text-[16px] font-semibold mb-1.5 tracking-tight">{c.title}</h3>
              <p className={"text-[13px] leading-snug " + (c.dark ? "text-zinc-400" : "text-zinc-600")}>
                {c.body}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
