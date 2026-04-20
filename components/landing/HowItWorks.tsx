"use client";

import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";

const EASE = [0.16, 1, 0.3, 1] as const;

function ConnectViz() {
  const t = useTranslations("howItWorks.visual_01");
  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <div className="flex gap-1.5 mb-3">
        <span className="w-2 h-2 rounded-full bg-red-400" />
        <span className="w-2 h-2 rounded-full bg-amber-400" />
        <span className="w-2 h-2 rounded-full bg-emerald-400" />
      </div>
      <div className="space-y-2.5">
        <div>
          <div className="text-[9px] uppercase tracking-wider text-muted-foreground mb-1">
            {t("broker")}
          </div>
          <div className="rounded-md border border-border bg-muted/40 px-3 py-2 text-[12px] font-medium text-foreground flex items-center justify-between">
            <span>MetaTrader 5</span>
            <span className="text-muted-foreground text-[10px]">▾</span>
          </div>
        </div>
        <div>
          <div className="text-[9px] uppercase tracking-wider text-muted-foreground mb-1">
            {t("account")}
          </div>
          <div className="rounded-md border border-border bg-muted/40 px-3 py-2 text-[12px] font-mono text-foreground">
            8245173
          </div>
        </div>
        <button
          type="button"
          className="w-full rounded-md bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 px-3 py-2 text-[12px] font-medium"
        >
          {t("cta")}
        </button>
      </div>
    </div>
  );
}

function ImportViz() {
  const t = useTranslations("howItWorks.visual_02");
  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <span className="text-[11px] font-medium text-foreground">{t("status")}</span>
        <span className="text-[10px] font-mono text-muted-foreground">8.342 / 12.500</span>
      </div>
      <div className="h-2 rounded-full bg-muted overflow-hidden">
        <motion.div
          className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-emerald-600"
          initial={{ width: "12%" }}
          whileInView={{ width: "66%" }}
          viewport={{ once: true, margin: "-15%" }}
          transition={{ duration: 1.4, ease: EASE, delay: 0.3 }}
        />
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2 text-[10px]">
        {[
          { label: t("parsed"), value: "8.342" },
          { label: t("enriched"), value: "8.342" },
          { label: t("indexed"), value: "6.891" },
        ].map((s) => (
          <div key={s.label} className="rounded border border-border bg-muted/30 px-2 py-1.5">
            <div className="text-muted-foreground text-[9px] uppercase tracking-wider">
              {s.label}
            </div>
            <div className="text-foreground font-mono text-[11px] mt-0.5">{s.value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function DexterInsightViz({ quote }: { quote: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <div className="flex gap-2.5">
        <div className="w-7 h-7 shrink-0 rounded-full bg-gradient-to-br from-violet-500 to-violet-700 text-white flex items-center justify-center text-[11px] font-semibold">
          D
        </div>
        <div className="flex-1">
          <div className="text-[10px] text-muted-foreground mb-1">Dexter</div>
          <div className="rounded-2xl rounded-tl-sm border border-border bg-muted/30 px-3 py-2.5 text-[12px] leading-snug text-foreground">
            {quote}
          </div>
        </div>
      </div>
    </div>
  );
}

function Step({
  index,
  numeral,
  title,
  body,
  visual,
}: {
  index: number;
  numeral: string;
  title: string;
  body: string;
  visual: ReactNode;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-10%" }}
      transition={{ duration: 0.7, ease: EASE, delay: index * 0.12 }}
      className="flex flex-col gap-5"
    >
      <div className="flex items-baseline gap-3">
        <span className="text-[11px] tracking-[0.18em] font-mono text-amber-600 dark:text-amber-500">
          {numeral}
        </span>
        <h3 className="text-[20px] sm:text-[22px] font-semibold leading-tight tracking-tight text-foreground">
          {title}
        </h3>
      </div>
      <p className="text-[14px] text-muted-foreground leading-relaxed">{body}</p>
      <div className="mt-2">{visual}</div>
    </motion.div>
  );
}

export function HowItWorks() {
  const t = useTranslations("howItWorks");

  return (
    <section id="how-it-works" className="py-20 lg:py-28 border-t border-border/60">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="mb-14 max-w-2xl">
          <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground font-mono mb-3">
            {t("eyebrow")}
          </div>
          <h2 className="text-[28px] sm:text-[36px] lg:text-[44px] font-semibold leading-[1.1] tracking-tight text-foreground">
            {t("heading")}{" "}
            <span className="text-muted-foreground italic font-normal">{t("headingAccent")}</span>
          </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 lg:gap-10">
          <Step
            index={0}
            numeral="01"
            title={t("step_01.title")}
            body={t("step_01.body")}
            visual={<ConnectViz />}
          />
          <Step
            index={1}
            numeral="02"
            title={t("step_02.title")}
            body={t("step_02.body")}
            visual={<ImportViz />}
          />
          <Step
            index={2}
            numeral="03"
            title={t("step_03.title")}
            body={t("step_03.body")}
            visual={<DexterInsightViz quote={t("step_03.visualQuote")} />}
          />
        </div>
      </div>
    </section>
  );
}
