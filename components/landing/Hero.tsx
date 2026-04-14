import Link from "next/link";
import { InteractiveFeatureShowcase } from "./InteractiveFeatureShowcase";
import { ShowcaseErrorBoundary } from "./ShowcaseErrorBoundary";

export function Hero() {
  return (
    <section className="relative overflow-hidden">
      {/* Subtle radial gradient — replaces SpiralBackground */}
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none -z-10"
        style={{
          background:
            "radial-gradient(ellipse at top, rgba(255,255,255,0.6), transparent 60%)",
        }}
      />
      <div className="mx-auto max-w-6xl px-6 pt-16 pb-20 lg:pt-24 lg:pb-28">
        <div className="grid lg:grid-cols-[1fr_1.15fr] gap-8 lg:gap-12 items-center">
          <div>
            <h1 className="text-[32px] lg:text-[44px] font-semibold leading-tight tracking-tight text-zinc-900">
              A plataforma completa do{" "}
              <span className="text-zinc-500 italic font-normal">trader profissional.</span>
            </h1>
            <p className="mt-4 text-[13px] lg:text-[15px] text-zinc-600 leading-relaxed max-w-[360px]">
              Journal automatizado, IA que lê seu histórico, calendário macroeconômico, backtest e
              gestão de risco para prop firms — tudo num lugar só.
            </p>
            <div className="mt-5 flex items-center gap-2">
              <Link
                href="/login"
                className="inline-flex items-center rounded-full bg-zinc-900 text-white px-5 py-2.5 text-[12px] font-medium hover:bg-zinc-800 transition-colors min-h-[44px]"
              >
                Começar grátis
              </Link>
              <Link
                href="/pricing"
                className="inline-flex items-center text-zinc-600 hover:text-zinc-900 px-3.5 py-2.5 text-[12px] transition-colors"
              >
                Ver preços →
              </Link>
            </div>
            <div className="mt-5 flex items-center gap-2.5">
              <div className="flex">
                {[
                  { bg: "from-orange-500 to-orange-600", l: "M" },
                  { bg: "from-blue-500 to-blue-700", l: "R" },
                  { bg: "from-emerald-500 to-emerald-600", l: "L" },
                  { bg: "from-violet-500 to-violet-600", l: "A" },
                  { bg: "from-red-500 to-red-600", l: "P" },
                ].map((a, i) => (
                  <div
                    key={a.l}
                    style={{ marginLeft: i === 0 ? 0 : -7 }}
                    className={`w-6 h-6 rounded-full border-2 border-zinc-50 bg-gradient-to-br ${a.bg} text-white text-[10px] font-semibold flex items-center justify-center`}
                  >
                    {a.l}
                  </div>
                ))}
              </div>
              <div className="text-[11px] text-zinc-600">
                <strong className="font-semibold text-zinc-900">+430 traders</strong> já usam diariamente
              </div>
            </div>
          </div>
          <div>
            <ShowcaseErrorBoundary>
              <InteractiveFeatureShowcase />
            </ShowcaseErrorBoundary>
          </div>
        </div>
      </div>
    </section>
  );
}
