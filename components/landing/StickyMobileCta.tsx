"use client";

import { useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { X } from "lucide-react";
import { SmartCTALink } from "@/components/landing/SmartCTALink";
import { track } from "@/lib/analytics/events";

const DISMISS_KEY = "wealth-sticky-mobile-dismissed";
const REVEAL_THRESHOLD = 0.3;

export function StickyMobileCta() {
  const t = useTranslations("stickyCta");
  const locale = useLocale();
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const shownRef = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    try {
      if (sessionStorage.getItem(DISMISS_KEY) === "1") {
        setDismissed(true);
        return;
      }
    } catch {
      // ignore
    }

    let raf = 0;
    const onScroll = () => {
      if (raf) return;
      raf = window.requestAnimationFrame(() => {
        raf = 0;
        const doc = document.documentElement;
        const max = doc.scrollHeight - window.innerHeight;
        if (max <= 0) return;
        const pct = window.scrollY / max;
        if (pct > REVEAL_THRESHOLD) {
          setVisible(true);
        }
      });
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();

    return () => {
      window.removeEventListener("scroll", onScroll);
      if (raf) window.cancelAnimationFrame(raf);
    };
  }, []);

  useEffect(() => {
    if (visible && !dismissed && !shownRef.current) {
      shownRef.current = true;
      track("sticky_mobile_shown", { locale });
    }
  }, [visible, dismissed, locale]);

  const handleDismiss = () => {
    setDismissed(true);
    try {
      sessionStorage.setItem(DISMISS_KEY, "1");
    } catch {
      // ignore
    }
    track("sticky_mobile_dismissed", { locale });
  };

  if (dismissed || !visible) return null;

  return (
    <div
      role="region"
      aria-label={t("regionAria")}
      className="md:hidden fixed inset-x-0 bottom-0 z-40 border-t border-border/60 bg-background/95 backdrop-blur-md shadow-[0_-8px_24px_rgba(0,0,0,0.08)] pb-[env(safe-area-inset-bottom)]"
      style={{ backgroundColor: "hsl(var(--background) / 0.95)" }}
    >
      <div className="flex items-center gap-3 px-4 py-3">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground truncate">
            {t("label")}
          </p>
        </div>
        <SmartCTALink
          loggedOutHref="/login?source=sticky_mobile"
          className="inline-flex h-9 items-center justify-center rounded-full bg-foreground px-4 text-sm font-medium text-background whitespace-nowrap"
          aria-label={t("cta")}
          onClick={() => {
            track("hero_cta_click", {
              variant: "primary",
              position: "sticky_mobile",
              source: "sticky_mobile",
            });
          }}
        >
          {t("cta")}
        </SmartCTALink>
        <button
          type="button"
          onClick={handleDismiss}
          aria-label={t("dismissAria")}
          className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
