"use client";

import { motion } from "framer-motion";
import { Upload, PenLine, Sparkles, Calendar, BarChart3, ArrowRight } from "lucide-react";
import { useAppT } from "@/hooks/useAppLocale";
import type { AppMessageKey } from "@/lib/i18n/app";

type ActionId = "import" | "manual";

type OnboardingAction = {
  id: ActionId;
  icon: typeof Upload;
  eyebrowKey: AppMessageKey;
  titleKey: AppMessageKey;
  descriptionKey: AppMessageKey;
  ctaKey: AppMessageKey;
  recommended?: boolean;
};

const ACTIONS: OnboardingAction[] = [
  {
    id: "import",
    icon: Upload,
    eyebrowKey: "journalOnboarding.importEyebrow",
    titleKey: "journalOnboarding.importTitle",
    descriptionKey: "journalOnboarding.importDescription",
    ctaKey: "journalOnboarding.importCta",
    recommended: true,
  },
  {
    id: "manual",
    icon: PenLine,
    eyebrowKey: "journalOnboarding.manualEyebrow",
    titleKey: "journalOnboarding.manualTitle",
    descriptionKey: "journalOnboarding.manualDescription",
    ctaKey: "journalOnboarding.manualCta",
  },
];

const PROMISES: { icon: typeof Sparkles; key: AppMessageKey }[] = [
  { icon: Sparkles, key: "journalOnboarding.promiseDebrief" },
  { icon: Calendar, key: "journalOnboarding.promiseCalendar" },
  { icon: BarChart3, key: "journalOnboarding.promiseKpis" },
];

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

interface JournalEmptyOnboardingProps {
  accountName?: string | null;
  onImportClick: () => void;
  onAddTradeClick: () => void;
}

export function JournalEmptyOnboarding({
  accountName,
  onImportClick,
  onAddTradeClick,
}: JournalEmptyOnboardingProps) {
  const t = useAppT();
  const handleClick = (id: ActionId) => {
    if (id === "import") onImportClick();
    else onAddTradeClick();
  };

  const heroTitle = accountName
    ? t("journalOnboarding.heroTitleWithAccount").replace("{account}", accountName)
    : t("journalOnboarding.heroTitle");

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: EASE }}
      className="mx-auto w-full max-w-4xl py-8 sm:py-12"
    >
      {/* Hero */}
      <div className="text-center mb-10 sm:mb-12">
        <div className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-muted/40 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground mb-5">
          <Sparkles className="h-3 w-3" />
          {t("journalOnboarding.step1of2")}
        </div>
        <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight text-foreground">
          {heroTitle}
        </h2>
        <p className="mt-3 text-sm sm:text-[15px] text-muted-foreground max-w-xl mx-auto leading-relaxed">
          {t("journalOnboarding.heroBody")}
        </p>
      </div>

      {/* Action cards */}
      <div className="grid gap-4 sm:grid-cols-2 mb-10">
        {ACTIONS.map((action, i) => {
          const Icon = action.icon;
          return (
            <motion.button
              key={action.id}
              type="button"
              onClick={() => handleClick(action.id)}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, ease: EASE, delay: 0.1 + i * 0.06 }}
              whileHover={{ y: -2 }}
              className="group relative flex flex-col text-left rounded-[22px] border border-border/60 p-6 transition-all hover:border-foreground/30 hover:shadow-soft dark:hover:shadow-soft-dark"
              style={{ backgroundColor: "hsl(var(--card))" }}
            >
              {action.recommended && (
                <span className="absolute -top-2 right-5 rounded-full bg-foreground px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-background">
                  {t("journalOnboarding.recommended")}
                </span>
              )}
              <div className="flex items-center gap-3 mb-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted/60 text-foreground transition-colors group-hover:bg-foreground group-hover:text-background">
                  <Icon className="h-4 w-4" />
                </div>
                <span className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
                  {t(action.eyebrowKey)}
                </span>
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2 tracking-tight">
                {t(action.titleKey)}
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed mb-5 flex-1">
                {t(action.descriptionKey)}
              </p>
              <div className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                {t(action.ctaKey)}
                <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
              </div>
            </motion.button>
          );
        })}
      </div>

      {/* Promise */}
      <div
        className="rounded-[22px] border border-border/60 p-5 sm:p-6"
        style={{ backgroundColor: "hsl(var(--card))" }}
      >
        <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground mb-4">
          {t("journalOnboarding.promisesTitle")}
        </p>
        <ul className="grid gap-3 sm:grid-cols-3">
          {PROMISES.map((promise) => {
            const Icon = promise.icon;
            return (
              <li key={promise.key} className="flex items-start gap-2.5">
                <div className="mt-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-muted/60 text-foreground shrink-0">
                  <Icon className="h-3 w-3" />
                </div>
                <span className="text-[13px] text-foreground/80 leading-snug">
                  {t(promise.key)}
                </span>
              </li>
            );
          })}
        </ul>
      </div>
    </motion.div>
  );
}
