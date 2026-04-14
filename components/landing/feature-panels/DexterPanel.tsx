const LAYERS = [
  {
    num: "①",
    tag: "Basilar — fundamentos",
    tone: "blue" as const,
    body: "Real yields em queda (-2bps), DXY enfraquecendo após CPI. Ambiente positivo pra ouro no médio prazo.",
  },
  {
    num: "②",
    tag: "Técnica",
    tone: "violet" as const,
    body: "Rompimento de $2.680 com volume. Próxima resistência em $2.715 (high mensal). Stop abaixo de $2.660.",
  },
  {
    num: "③",
    tag: "Risco",
    tone: "amber" as const,
    body: "Risk/Reward 1:2.5 no setup atual. Evitar entradas 30min antes do NFP (19:30).",
  },
  {
    num: "④",
    tag: "Topo da cadeia — tese",
    tone: "emerald" as const,
    body: "Compra com alvo $2.715. Invalidação técnica em $2.660. Confluência: fundamento + técnico + timing favorável.",
  },
];

const TONE: Record<"blue" | "violet" | "amber" | "emerald", string> = {
  blue: "text-blue-600",
  violet: "text-violet-600",
  amber: "text-amber-600",
  emerald: "text-emerald-600",
};

export function DexterPanel() {
  return (
    <div className="h-full flex flex-col gap-1.5">
      <div className="text-[10px] uppercase tracking-wider text-zinc-400 mb-1">
        Dexter · análise de XAU/USD
      </div>
      <div className="flex items-center gap-2.5 rounded-md border border-zinc-100 bg-white px-3 py-2 mb-1">
        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-violet-500 to-violet-700 text-white flex items-center justify-center text-sm font-semibold">
          D
        </div>
        <div>
          <div className="text-[12px] font-semibold text-zinc-900">Análise completa — Ouro</div>
          <div className="text-[9px] text-zinc-500">Executada há 2min · 4 camadas</div>
        </div>
      </div>
      {LAYERS.map((l) => (
        <div key={l.tag} className="rounded-md border border-zinc-100 bg-white px-2.5 py-2">
          <div className={`text-[8px] uppercase tracking-wider font-semibold mb-0.5 ${TONE[l.tone]}`}>
            {l.num} {l.tag}
          </div>
          <p className="text-[10px] text-zinc-700 leading-snug m-0">{l.body}</p>
        </div>
      ))}
    </div>
  );
}
