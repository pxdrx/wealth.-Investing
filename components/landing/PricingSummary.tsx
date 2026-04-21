import Link from "next/link";
import { Check } from "lucide-react";
import { useTranslations } from "next-intl";
import { SmartCTALink } from "./SmartCTALink";
import { PricingComparison } from "./PricingComparison";
import { PricingViewAnalytics } from "./PricingViewAnalytics";

// Prices kept in sync with components/billing/PricingCards.tsx (track C).
// TODO(post-B): extract tier data to lib/pricing/tiers.ts — coord w/ Track C.
type TierId = "free" | "pro" | "ultra";

type Tier = {
  id: TierId;
  price: string;
  highlighted?: boolean;
  featureCount: number;
};

const TIERS: Tier[] = [
  { id: "free", price: "R$0", featureCount: 5 },
  { id: "pro", price: "R$29,90", highlighted: true, featureCount: 7 },
  { id: "ultra", price: "R$49,90", featureCount: 9 },
];

export function PricingSummary() {
  const t = useTranslations("pricing");

  return (
    <section className="py-20 lg:py-28 border-t border-border/60">
      <PricingViewAnalytics />
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="mb-10 max-w-2xl">
          <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground font-mono mb-3">
            {t("eyebrow")}
          </div>
          <h2 className="text-[28px] sm:text-[36px] lg:text-[44px] font-semibold leading-[1.1] tracking-tight text-foreground">
            {t("heading")}{" "}
            <span className="text-muted-foreground italic font-normal">{t("headingAccent")}</span>
          </h2>
          <p className="mt-4 text-[15px] text-muted-foreground max-w-xl leading-relaxed">
            {t("subhead")}
          </p>
        </div>

        <PricingComparison />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-5 items-stretch">
          {TIERS.map((tier) => {
            const isPro = tier.id === "pro";
            const isFree = tier.id === "free";
            const features = Array.from({ length: tier.featureCount }, (_, i) =>
              t(`tiers.${tier.id}.features.${i}`),
            );

            return (
              <div
                key={tier.id}
                className={
                  "relative rounded-[22px] border bg-card p-6 sm:p-8 flex flex-col " +
                  (tier.highlighted
                    ? "border-amber-400/60 ring-1 ring-amber-400/70 lg:scale-[1.03]"
                    : "border-border")
                }
              >
                {tier.highlighted && (
                  <span className="absolute -top-3 left-6 text-[9px] uppercase tracking-[0.18em] font-mono font-semibold rounded-full px-2.5 py-1 bg-amber-500 text-white">
                    {t("badges.popular")}
                  </span>
                )}

                <div className="mb-5">
                  <div className="text-[14px] font-semibold text-foreground mb-1">
                    {t(`tiers.${tier.id}.name`)}
                  </div>
                  <p className="text-[12px] text-muted-foreground leading-snug">
                    {t(`tiers.${tier.id}.tagline`)}
                  </p>
                </div>

                <div className="flex items-baseline gap-1 mb-6">
                  <span className="text-[32px] font-semibold tracking-tight text-foreground">
                    {tier.price}
                  </span>
                  {!isFree && (
                    <span className="text-[13px] text-muted-foreground">
                      {t("tiers.priceSuffix")}
                    </span>
                  )}
                </div>

                {isFree ? (
                  <SmartCTALink className="inline-flex items-center justify-center rounded-full bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 px-5 py-2.5 text-[13px] font-medium hover:opacity-90 transition-opacity min-h-[44px] mb-6">
                    {t(`tiers.free.cta`)}
                  </SmartCTALink>
                ) : (
                  <Link
                    href="/pricing"
                    className={
                      "inline-flex items-center justify-center rounded-full px-5 py-2.5 text-[13px] font-medium transition-colors min-h-[44px] mb-6 " +
                      (isPro
                        ? "bg-amber-500 text-white hover:bg-amber-600"
                        : "bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 hover:opacity-90")
                    }
                  >
                    {t(`tiers.${tier.id}.cta`)}
                  </Link>
                )}

                <ul className="space-y-2.5 flex-1">
                  {features.map((f, i) => (
                    <li key={i} className="flex items-start gap-2 text-[13px] leading-snug">
                      <Check
                        className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600 dark:text-emerald-500"
                        aria-hidden
                      />
                      <span className="text-foreground/85">{f}</span>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>

        <div className="mt-10 flex items-center justify-center gap-3 flex-wrap">
          <Link
            href="/pricing"
            className="inline-flex items-center rounded-full bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 px-5 py-2.5 text-[13px] font-medium hover:opacity-90 transition-opacity min-h-[44px]"
          >
            {t("cta.primary")}
          </Link>
          <SmartCTALink className="inline-flex items-center text-muted-foreground hover:text-foreground px-4 py-2.5 text-[13px] transition-colors min-h-[44px]">
            {t("cta.ghost")}
          </SmartCTALink>
        </div>
      </div>
    </section>
  );
}
