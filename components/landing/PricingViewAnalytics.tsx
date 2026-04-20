"use client";

import { useEffect } from "react";
import { useLocale } from "next-intl";
import { track } from "@/lib/analytics/events";

export function PricingViewAnalytics() {
  const locale = useLocale();
  useEffect(() => {
    track("pricing_view", { locale });
  }, [locale]);
  return null;
}
