"use client";

import { PricingCards } from "@/components/billing/PricingCards";
import { useAppT } from "@/hooks/useAppLocale";

export default function PricingPage() {
  const t = useAppT();
  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <h1 className="text-2xl font-semibold tracking-tight">{t("pricing.page.title")}</h1>
      <p className="text-sm text-muted-foreground mb-8">
        {t("pricing.page.subtitle")}
      </p>
      <PricingCards />
    </div>
  );
}
