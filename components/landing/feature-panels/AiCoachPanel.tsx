const INSIGHTS = [
  { kind: "Melhor setup:", body: "pullback em EUR/USD na sessão de Londres (win rate 78%, 23 trades)." },
  { kind: "Alerta:", body: "você perde 2x mais nas quintas — revise seu plano." },
  { kind: "Sugestão:", body: "reduza tamanho em XAU nas news de CPI (DD médio -2.3%)." },
];

export function AiCoachPanel() {
  return (
    <div className="h-full flex flex-col gap-2">
      <div className="text-[10px] uppercase tracking-wider text-zinc-400 mb-1">
        IA Coach · análise automática
      </div>
      {INSIGHTS.map((i) => (
        <div
          key={i.kind}
          className="rounded-md border-l-[3px] border-violet-500 bg-violet-50 px-3 py-2.5 text-[11px] text-zinc-700 leading-snug"
        >
          <strong className="text-violet-700 font-semibold">{i.kind}</strong> {i.body}
        </div>
      ))}
    </div>
  );
}
