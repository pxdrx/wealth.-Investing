"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CpuArchitecture } from "@/components/ui/cpu-architecture";
import { useAppT } from "@/hooks/useAppLocale";
import type { AppMessageKey } from "@/lib/i18n/app";

const STEP_KEYS: AppMessageKey[] = [
  "psychologyLoading.step1",
  "psychologyLoading.step2",
  "psychologyLoading.step3",
  "psychologyLoading.step4",
  "psychologyLoading.step5",
  "psychologyLoading.step6",
];

const easeApple: [number, number, number, number] = [0.16, 1, 0.3, 1];

/**
 * Loading diferenciado para a aba Psicologia: CpuArchitecture como background
 * que preenche o card + mensagens rotativas + barra de progresso assintótica.
 */
export function PsychologyLoadingAnimation() {
  const t = useAppT();
  const STEPS = useMemo(() => STEP_KEYS.map((k) => t(k)), [t]);
  const [stepIdx, setStepIdx] = useState(0);
  const [pct, setPct] = useState(5);

  useEffect(() => {
    const stepTimer = setInterval(() => {
      setStepIdx((i) => (i + 1) % STEPS.length);
    }, 2500);

    const pctTimer = setInterval(() => {
      setPct((p) => Math.min(p + (95 - p) * 0.08, 95));
    }, 400);

    return () => {
      clearInterval(stepTimer);
      clearInterval(pctTimer);
    };
  }, [STEPS.length]);

  return (
    <div
      className="relative rounded-[22px] border border-border/40 p-8 flex flex-col items-center justify-center isolate overflow-hidden bg-card min-h-[360px]"
    >
      <div className="relative z-10 flex flex-col items-center gap-6 w-full max-w-md mx-auto">
        {/* Focused CPU element */}
        <div className="text-indigo-500 dark:text-indigo-400 drop-shadow-sm">
          <CpuArchitecture
            width="320"
            height="220"
            text={t("psychologyLoading.cpuLabel")}
            animateMarkers
            animateLines
            animateText
          />
        </div>

        <div className="flex flex-col items-center gap-4 w-full">
          <AnimatePresence mode="wait">
            <motion.div
              key={stepIdx}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.3, ease: easeApple }}
              className="text-sm font-medium text-foreground tracking-wide"
            >
              {STEPS[stepIdx]}…
            </motion.div>
          </AnimatePresence>

          {/* Loading bar */}
          <div className="relative w-full max-w-[280px] h-1.5 rounded-full bg-muted overflow-hidden">
            <motion.div
              className="absolute left-0 top-0 h-full rounded-full bg-gradient-to-r from-indigo-500 via-fuchsia-500 to-pink-500"
              initial={{ width: "5%" }}
              animate={{ width: `${pct}%` }}
              transition={{ duration: 0.5, ease: easeApple }}
            />
          </div>

          <p className="text-[11px] text-muted-foreground text-center">
            {t("psychologyLoading.firstHint")}
          </p>
        </div>
      </div>
    </div>
  );
}
