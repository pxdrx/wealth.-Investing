"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";

const easeApple = [0.16, 1, 0.3, 1];

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
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>Uso mensal do AI Coach</span>
        <span>
          <span className="font-semibold text-foreground">{used}</span>/{limit} este mês
        </span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
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
