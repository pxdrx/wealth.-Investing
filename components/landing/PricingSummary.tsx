import Link from "next/link";

type Tier = {
  name: string;
  price: string;
  period: string;
  desc: string;
  highlighted?: boolean;
};

const TIERS: Tier[] = [
  {
    name: "Grátis",
    price: "R$0",
    period: "/mês",
    desc: "Comece a registrar. Journal básico, 1 conta prop, IA Coach limitada.",
  },
  {
    name: "Pro",
    price: "R$29,90",
    period: "/mês",
    desc: "Contas ilimitadas, IA Coach completa, macroeconomia, backtest e Risk.",
    highlighted: true,
  },
  {
    name: "Ultra",
    price: "R$49,90",
    period: "/mês",
    desc: "Tudo do Pro + Dexter ilimitado, análises profundas e suporte prioritário.",
  },
];

export function PricingSummary() {
  return (
    <section className="py-16 lg:py-24">
      <div className="mx-auto max-w-4xl px-6 text-center">
        <div className="text-[11px] uppercase tracking-wider text-zinc-500 font-medium mb-2">
          Preços
        </div>
        <h2 className="text-[28px] lg:text-[36px] font-semibold leading-tight tracking-tight text-zinc-900 mb-3">
          Planos a partir de{" "}
          <span className="text-zinc-500 italic font-normal">R$0/mês.</span>
        </h2>
        <p className="text-[14px] text-zinc-600 max-w-xl mx-auto mb-10">
          Comece grátis. Faça upgrade quando quiser — sem contrato, sem taxa de cancelamento.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-10">
          {TIERS.map((t) => (
            <div
              key={t.name}
              className={
                "rounded-[22px] border p-5 text-left transition-colors " +
                (t.highlighted
                  ? "bg-zinc-900 text-white border-zinc-900 shadow-lg"
                  : "bg-white text-zinc-900 border-zinc-200")
              }
            >
              <div className="flex items-center justify-between mb-2">
                <div className="text-[14px] font-semibold">{t.name}</div>
                {t.highlighted && (
                  <span className="text-[9px] uppercase tracking-wider font-semibold text-violet-300">
                    Mais popular
                  </span>
                )}
              </div>
              <div className="flex items-baseline gap-1 mb-2">
                <span className={"text-[22px] font-semibold " + (t.highlighted ? "text-white" : "text-zinc-900")}>
                  {t.price}
                </span>
                <span className={"text-[11px] " + (t.highlighted ? "text-zinc-400" : "text-zinc-500")}>
                  {t.period}
                </span>
              </div>
              <p className={"text-[12px] leading-snug " + (t.highlighted ? "text-zinc-300" : "text-zinc-600")}>
                {t.desc}
              </p>
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
