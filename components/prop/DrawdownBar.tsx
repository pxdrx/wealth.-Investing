"use client";

import { motion } from "framer-motion";
import { useMemo } from "react";

const easeApple: [number, number, number, number] = [0.16, 1, 0.3, 1];

interface DrawdownBarProps {
  label: string;
  currentPct: number;
  maxPct: number;
}

function getBarColor(fillPct: number): string {
  if (fillPct >= 90) return "#ef4444";
  if (fillPct >= 70) return "#f97316";
  if (fillPct >= 50) return "#f59e0b";
  return "#10b981";
}

export function DrawdownBar({ label, currentPct, maxPct }: DrawdownBarProps) {
  const fillPct = useMemo(() => {
    if (maxPct <= 0) return 0;
    const raw = (currentPct / maxPct) * 100;
    return Math.min(100, Math.max(0, raw));
  }, [currentPct, maxPct]);

  const barColor = useMemo(() => getBarColor(fillPct), [fillPct]);

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium tracking-tight" style={{ color: "hsl(var(--foreground))" }}>
          {label}
        </span>
        <span className="text-sm font-semibold tabular-nums" style={{ color: barColor }}>
          {currentPct.toFixed(1)}%
        </span>
      </div>
      <div
        className="h-3 w-full overflow-hidden rounded-full"
        style={{ backgroundColor: "hsl(var(--muted))" }}
      >
        <motion.div
          className="h-full rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${fillPct}%` }}
          transition={{ duration: 0.6, ease: easeApple }}
          style={{ backgroundColor: barColor }}
        />
      </div>
    </div>
  );
}
