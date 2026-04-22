"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useLocale, useTranslations } from "next-intl";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Sparkles, Copy, Check } from "lucide-react";
import { useExitIntent } from "@/hooks/useExitIntent";
import { SmartCTALink } from "@/components/landing/SmartCTALink";
import { track } from "@/lib/analytics/events";

const COUPON_CODE = "IMERSAOHSM";

export function ExitIntentModal() {
  const t = useTranslations("exitIntent");
  const locale = useLocale();
  const { open, dismiss } = useExitIntent();
  const emittedRef = useRef(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (open && !emittedRef.current) {
      emittedRef.current = true;
      track("exit_intent_shown", { locale });
    }
  }, [open, locale]);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(COUPON_CODE);
      setCopied(true);
      track("coupon_copied", { coupon: COUPON_CODE, source: "exit_intent" });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback: select text
    }
  }, []);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && dismiss()}>
      <DialogContent
        className="max-w-[520px]"
        style={{ backgroundColor: "hsl(var(--card))" }}
      >
        <DialogHeader>
          <div className="flex items-center gap-2 mb-1">
            <Sparkles className="h-4 w-4 text-foreground" />
            <span className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
              {t("eyebrow")}
            </span>
          </div>
          <DialogTitle className="text-2xl leading-tight-apple tracking-tight-apple">
            {t("heading")}
          </DialogTitle>
          <DialogDescription className="text-sm leading-relaxed pt-2">
            {t("body")}
          </DialogDescription>
        </DialogHeader>

        {/* Coupon code block */}
        <div className="mt-2 mb-1">
          <button
            type="button"
            onClick={handleCopy}
            className="group flex w-full items-center justify-between gap-3 rounded-[14px] border border-dashed border-emerald-500/30 bg-emerald-500/5 px-5 py-3.5 transition-colors hover:bg-emerald-500/10 hover:border-emerald-500/50"
          >
            <div className="flex items-center gap-3 min-w-0">
              <span className="text-lg font-mono font-bold tracking-widest text-emerald-600 dark:text-emerald-400">
                {COUPON_CODE}
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground shrink-0">
              {copied ? (
                <>
                  <Check className="h-3.5 w-3.5 text-emerald-500" />
                  <span className="text-emerald-500 font-medium">Copiado!</span>
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5 group-hover:text-foreground transition-colors" />
                  <span className="group-hover:text-foreground transition-colors">
                    {t("couponHint")}
                  </span>
                </>
              )}
            </div>
          </button>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2 sm:gap-3 pt-2">
          <Button
            variant="ghost"
            onClick={dismiss}
            className="w-full sm:w-auto order-2 sm:order-1"
          >
            {t("ctaGhost")}
          </Button>
          <SmartCTALink
            loggedOutHref={`/login?plan=pro&promo=${COUPON_CODE}`}
            className="inline-flex h-10 items-center justify-center rounded-full bg-foreground px-6 text-sm font-medium text-background hover:bg-foreground/90 transition-colors w-full sm:w-auto order-1 sm:order-2"
            aria-label={t("ctaPrimary")}
            onClick={() => {
              track("hero_cta_click", {
                variant: "primary",
                position: "exit_intent",
                source: "exit_intent",
              });
              dismiss();
            }}
          >
            {t("ctaPrimary")}
          </SmartCTALink>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
