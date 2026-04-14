const STEPS = [
  { n: "01", title: "Importe", body: "MT5/MT4 em segundos. XLSX ou HTML — sem cadastrar credenciais de corretora." },
  { n: "02", title: "Analise", body: "IA lê seu histórico e mostra padrões que você não via. Journal preenche sozinho." },
  { n: "03", title: "Evolua", body: "Decisões baseadas em dados reais, não em intuição. Prop firms mais próximas." },
];

export function HowItWorks() {
  return (
    <section className="py-16 lg:py-20 bg-white border-y border-zinc-200">
      <div className="mx-auto max-w-6xl px-6">
        <div className="mb-10 text-center lg:text-left">
          <div className="text-[11px] uppercase tracking-wider text-zinc-500 font-medium mb-2">
            Como funciona
          </div>
          <h2 className="text-[28px] lg:text-[36px] font-semibold leading-tight tracking-tight text-zinc-900 max-w-xl">
            Três passos.{" "}
            <span className="text-zinc-500 italic font-normal">Zero fricção.</span>
          </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {STEPS.map((s) => (
            <div key={s.n} className="flex flex-col">
              <div className="text-[48px] font-semibold tracking-tight text-zinc-300 leading-none mb-3">
                {s.n}
              </div>
              <h3 className="text-[18px] font-semibold text-zinc-900 mb-2 tracking-tight">
                {s.title}
              </h3>
              <p className="text-[14px] text-zinc-600 leading-snug">{s.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
