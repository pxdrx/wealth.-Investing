import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import { HeroPrimaryCta, HeroGhostCta } from "./HeroCta";

export function Hero({ socialProof }: { socialProof?: ReactNode }) {
  const t = useTranslations("hero");

  return (
    <section className="relative overflow-hidden">
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none -z-10"
        style={{
          background:
            "radial-gradient(ellipse at top, rgba(255,255,255,0.6), transparent 60%)",
        }}
      />
      <div className="mx-auto max-w-3xl px-4 sm:px-6 pt-20 pb-16 sm:pt-24 lg:pt-32 lg:pb-24 text-center">
        <h1 className="text-[40px] sm:text-[56px] lg:text-[72px] font-semibold leading-[1.05] tracking-tight text-foreground">
          {t("headline")}
        </h1>
        <p className="mt-5 sm:mt-6 text-[17px] sm:text-[19px] lg:text-[20px] text-muted-foreground leading-relaxed max-w-[600px] mx-auto">
          {t("sub")}
        </p>
        <div className="mt-8 sm:mt-10 flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3 sm:gap-4">
          <HeroPrimaryCta className="inline-flex items-center justify-center rounded-full bg-zinc-900 text-white px-6 py-3 text-[14px] sm:text-[15px] font-medium hover:bg-zinc-800 transition-colors min-h-[48px] w-full sm:w-auto">
            {t("ctaPrimary")}
          </HeroPrimaryCta>
          <HeroGhostCta
            href="#how-it-works"
            className="inline-flex items-center justify-center text-muted-foreground hover:text-foreground px-4 py-3 text-[14px] sm:text-[15px] transition-colors min-h-[48px] w-full sm:w-auto"
          >
            {t("ctaGhost")}
          </HeroGhostCta>
        </div>
        {socialProof}
      </div>
    </section>
  );
}
