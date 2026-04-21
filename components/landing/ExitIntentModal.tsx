"use client";

import { useEffect, useRef } from "react";
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
import { Sparkles } from "lucide-react";
import { useExitIntent } from "@/hooks/useExitIntent";
import { SmartCTALink } from "@/components/landing/SmartCTALink";
import { track } from "@/lib/analytics/events";

export function ExitIntentModal() {
  const t = useTranslations("exitIntent");
  const locale = useLocale();
  const { open, dismiss } = useExitIntent();
  const emittedRef = useRef(false);

  useEffect(() => {
    if (open && !emittedRef.current) {
      emittedRef.current = true;
      track("exit_intent_shown", { locale });
    }
  }, [open, locale]);

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
        <DialogFooter className="flex-col sm:flex-row gap-2 sm:gap-3 pt-2">
          <Button
            variant="ghost"
            onClick={dismiss}
            className="w-full sm:w-auto order-2 sm:order-1"
          >
            {t("ctaGhost")}
          </Button>
          <SmartCTALink
            loggedOutHref="/login?plan=pro&promo=exit30"
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
