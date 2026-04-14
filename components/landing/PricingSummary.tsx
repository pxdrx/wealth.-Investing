import Link from "next/link";

const TIERS = [
  { name: "Grátis", desc: "Journal básico, até 1 conta prop, IA Coach limitada." },
  { name: "Pro", desc: "Tudo grátis + contas ilimitadas, IA Coach completa, macroeconomia e backtest." },
  { name: "Mentor", desc: "Tudo Pro + painel de alunos, códigos de convite, gestão de turmas." },
];

export function PricingSummary() {
  return (
    <section className="py-16 lg:py-24">
      <div className="mx-auto max-w-4xl px-6 text-center">
        <div className="text-[11px] uppercase tracking-wider text-zinc-500 font-medium mb-2">
          Preços
        </div>
        <h2 className="text-[28px] lg:text-[36px] font-semibold leading-tight tracking-tight text-zinc-900 mb-3">
          Planos a partir de <span className="text-zinc-500 italic font-normal">R$0/mês.</span>
        </h2>
        <p className="text-[14px] text-zinc-600 max-w-xl mx-auto mb-10">
          Comece grátis. Faça upgrade quando quiser — sem contrato, sem taxa de cancelamento.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-10">
          {TIERS.map((t) => (
            <div
              key={t.name}
              className="rounded-[22px] border border-zinc-200 bg-white p-5 text-left"
            >
              <div className="text-[14px] font-semibold text-zinc-900 mb-1.5">{t.name}</div>
              <p className="text-[12px] text-zinc-600 leading-snug">{t.desc}</p>
            </div>
          ))}
        </div>
        <div className="flex items-center justify-center gap-3 flex-wrap">
          <Link
            href="/pricing"
            className="inline-flex items-center rounded-full bg-zinc-900 text-white px-5 py-2.5 text-[12px] font-medium hover:bg-zinc-800 transition-colors min-h-[44px]"
          >
            Ver todos os planos →
          </Link>
          <Link
            href="/login"
            className="inline-flex items-center text-zinc-600 hover:text-zinc-900 px-3.5 py-2.5 text-[12px] transition-colors"
          >
            Começar grátis
          </Link>
        </div>
      </div>
    </section>
  );
}
