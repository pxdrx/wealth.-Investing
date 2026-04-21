import { setRequestLocale, getTranslations } from "next-intl/server";
import { PricingCards } from "@/components/billing/PricingCards";
import { HeroPrimaryCta } from "@/components/landing/HeroCta";

export const revalidate = 3600;

export default async function PricingPage({
  params,
}: {
  params: { locale: string };
}) {
  setRequestLocale(params.locale);
  const t = await getTranslations("pricing.page");

  return (
    <section className="mx-auto max-w-6xl px-4 sm:px-6 py-16 lg:py-24">
      <div className="text-center mb-12 lg:mb-16 max-w-2xl mx-auto">
        <div className="text-[11px] uppercase tracking-[0.18em] font-mono text-muted-foreground mb-3">
          {t("eyebrow")}
        </div>
        <h1 className="text-[32px] sm:text-[44px] lg:text-[56px] font-semibold leading-[1.05] tracking-tight text-foreground">
          {t("heading")}{" "}
          <span className="text-muted-foreground italic font-normal">{t("headingAccent")}</span>
        </h1>
        <p className="mt-5 text-[15px] sm:text-[17px] text-muted-foreground leading-relaxed">
          {t("subhead")}
        </p>
      </div>

      <PricingCards />

      <div className="mt-16 text-center">
        <p className="text-[13px] text-muted-foreground mb-5">{t("footer")}</p>
        <HeroPrimaryCta className="inline-flex items-center justify-center rounded-full bg-zinc-900 text-white px-6 py-3 text-[14px] font-medium hover:bg-zinc-800 transition-colors min-h-[48px]">
          {t("cta")}
        </HeroPrimaryCta>
      </div>
    </section>
  );
}
