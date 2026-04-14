"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { FEATURES, DEFAULT_FEATURE, type FeatureKey } from "./feature-panels/types";
import { JournalPanel } from "./feature-panels/JournalPanel";
import { AiCoachPanel } from "./feature-panels/AiCoachPanel";
import { MacroPanel } from "./feature-panels/MacroPanel";
import { DexterPanel } from "./feature-panels/DexterPanel";
import { BacktestPanel } from "./feature-panels/BacktestPanel";
import { RiskPanel } from "./feature-panels/RiskPanel";
import { MentorPanel } from "./feature-panels/MentorPanel";

const PANELS: Record<FeatureKey, () => JSX.Element> = {
  journal: JournalPanel,
  ai: AiCoachPanel,
  macro: MacroPanel,
  dexter: DexterPanel,
  backtest: BacktestPanel,
  risk: RiskPanel,
  mentor: MentorPanel,
};

type Ctx = { active: FeatureKey; setActive: (k: FeatureKey) => void };
const ShowcaseCtx = createContext<Ctx | null>(null);

function useShowcase(): Ctx {
  const ctx = useContext(ShowcaseCtx);
  if (!ctx) throw new Error("useShowcase must be used inside <ShowcaseProvider>");
  return ctx;
}

export function ShowcaseProvider({ children }: { children: ReactNode }) {
  const [active, setActive] = useState<FeatureKey>(DEFAULT_FEATURE);
  return <ShowcaseCtx.Provider value={{ active, setActive }}>{children}</ShowcaseCtx.Provider>;
}

export function ShowcasePills({ className = "" }: { className?: string }) {
  const { active, setActive } = useShowcase();
  return (
    <div
      role="tablist"
      aria-label="Funcionalidades"
      className={"flex flex-wrap gap-1.5 lg:gap-2 " + className}
    >
      {FEATURES.map((f) => {
        const isActive = active === f.key;
        return (
          <button
            key={f.key}
            type="button"
            role="tab"
            aria-selected={isActive}
            aria-controls={`panel-${f.key}`}
            onClick={() => setActive(f.key)}
            className={
              "rounded-full px-3 py-1.5 text-[11px] font-medium transition-colors min-h-[36px] active:scale-95 " +
              (isActive
                ? "bg-zinc-900 text-white border border-zinc-900"
                : "bg-white text-zinc-600 border border-zinc-200 hover:border-zinc-400")
            }
          >
            {f.label}
          </button>
        );
      })}
    </div>
  );
}

export function ShowcaseScreenshot() {
  const { active } = useShowcase();
  const ActivePanel = PANELS[active] ?? PANELS.journal;
  const showCallouts = active === "journal";
  const prefersReducedMotion = useReducedMotion();
  const fadeDuration = prefersReducedMotion ? 0 : 0.2;

  return (
    <div className="relative px-0 lg:px-6 py-5">
      <div
        id={`panel-${active}`}
        role="tabpanel"
        aria-labelledby={`tab-${active}`}
        className="relative rounded-xl border border-zinc-200 bg-gradient-to-b from-white to-zinc-50 shadow-[0_24px_48px_-16px_rgba(0,0,0,0.14)] h-[420px] lg:h-[460px] p-4 overflow-hidden"
      >
        <div className="flex gap-1.5 mb-3">
          <span className="w-2 h-2 rounded-full bg-red-400" />
          <span className="w-2 h-2 rounded-full bg-amber-400" />
          <span className="w-2 h-2 rounded-full bg-emerald-400" />
        </div>
        <div className="h-[calc(100%-20px)] relative">
          <AnimatePresence initial={false}>
            <motion.div
              key={active}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: fadeDuration }}
              className="absolute inset-0"
            >
              <ActivePanel />
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Callouts — desktop only, only when Journal */}
      <div
        data-testid="showcase-callouts"
        data-visible={showCallouts}
        aria-hidden={!showCallouts}
        className={
          "hidden lg:block pointer-events-none transition-opacity duration-300 " +
          (showCallouts ? "opacity-100" : "opacity-0")
        }
      >
        <Callout tone="violet" label="IA Coach" value="3 insights" className="absolute top-2 -left-4" />
        <Callout tone="blue" label="Macroeconomia" value="CPI 14h" className="absolute top-1/2 -right-6 -translate-y-1/2" />
        <Callout tone="amber" label="Drawdown" value="-4.1%" className="absolute bottom-2 left-6" />
      </div>
    </div>
  );
}

/**
 * Self-contained showcase (pills + screenshot side-by-side).
 * Kept for backwards compatibility with tests; new layouts should use
 * <ShowcaseProvider> with separate <ShowcasePills/> and <ShowcaseScreenshot/>.
 */
export function InteractiveFeatureShowcase() {
  return (
    <ShowcaseProvider>
      <div className="grid lg:grid-cols-[1fr_1.15fr] gap-8 lg:gap-12 items-center">
        <ShowcasePills />
        <ShowcaseScreenshot />
      </div>
    </ShowcaseProvider>
  );
}

function Callout({
  tone,
  label,
  value,
  className = "",
}: {
  tone: "violet" | "blue" | "amber";
  label: string;
  value: string;
  className?: string;
}) {
  const iconBg = {
    violet: "bg-violet-100 text-violet-700",
    blue: "bg-blue-100 text-blue-700",
    amber: "bg-amber-100 text-amber-700",
  }[tone];
  const iconChar = { violet: "✦", blue: "◑", amber: "⚠" }[tone];
  return (
    <div
      className={
        "bg-white rounded-xl px-3 py-2 text-[10px] shadow-[0_12px_28px_-8px_rgba(0,0,0,0.18)] flex items-center gap-2 z-10 " +
        className
      }
    >
      <div className={`w-[22px] h-[22px] rounded-md flex items-center justify-center text-[11px] ${iconBg}`}>
        {iconChar}
      </div>
      <div>
        <div className="text-zinc-500 text-[9px]">{label}</div>
        <div className="font-semibold text-zinc-900 text-[12px]">{value}</div>
      </div>
    </div>
  );
}
