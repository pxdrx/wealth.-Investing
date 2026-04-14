const FIRMS = ["The5ers", "FTMO", "FundedNext", "MyForexFunds", "Apex", "Topstep"];

export function TrustBar() {
  return (
    <section className="border-y border-zinc-200 bg-white/60 backdrop-blur-sm">
      <div className="mx-auto max-w-6xl px-6 py-8 flex flex-col items-center gap-4 text-center">
        <span className="text-[11px] uppercase tracking-wider text-zinc-500 font-medium">
          Compatível com sua prop firm
        </span>
        <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 md:gap-x-10">
          {FIRMS.map((f) => (
            <span
              key={f}
              className="text-[13px] font-semibold text-zinc-400 hover:text-zinc-700 transition-colors"
            >
              {f}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
