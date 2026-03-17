"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";

const easeApple: [number, number, number, number] = [0.16, 1, 0.3, 1];

interface UsageBarProps {
  used: number;
  limit: number;
}

function getBarColor(pct: number): string {
  if (pct >= 90) return "bg-red-500";
  if (pct >= 70) return "bg-amber-500";
  return "bg-green-500";
}

export function UsageBar({ used, limit }: UsageBarProps) {
  const pct = useMemo(() => {
    if (limit <= 0) return 0;
    return Math.min(100, Math.max(0, (used / limit) * 100));
  }, [used, limit]);

  const color = getBarColor(pct);

  return (
    <div
      className="flex flex-col gap-2 rounded-[16px] border border-border/50 px-4 py-3"
      style={{ backgroundColor: "hsl(var(--card))" }}
    >
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground font-medium">Uso mensal do AI Coach</span>
        <span className="text-muted-foreground">
          <span className="font-semibold text-foreground">{used}</span>
          <span className="text-muted-foreground">/{limit} este mês</span>
        </span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-muted/50">
        <motion.div
          className={`h-full rounded-full ${color}`}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.6, ease: easeApple }}
        />
      </div>
    </div>
  );
}
