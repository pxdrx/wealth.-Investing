"use client";

import { useEffect } from "react";
import { track, parseUtmParams } from "@/lib/analytics/events";

export function LandingAnalytics({ locale }: { locale: string }) {
  useEffect(() => {
    track("landing_view", {
      locale,
      referrer: typeof document !== "undefined" ? document.referrer || null : null,
      ...parseUtmParams(),
    });
  }, [locale]);
  return null;
}
