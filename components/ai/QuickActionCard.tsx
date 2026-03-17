"use client";

import { type LucideIcon } from "lucide-react";
import { motion } from "framer-motion";

interface QuickActionCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
  onClick: () => void;
  disabled?: boolean;
}

export function QuickActionCard({ icon: Icon, title, description, onClick, disabled }: QuickActionCardProps) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      disabled={disabled}
      whileHover={disabled ? undefined : { scale: 1.02, y: -2 }}
      whileTap={disabled ? undefined : { scale: 0.98 }}
      transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
      className="flex h-full flex-col items-start gap-3 rounded-[22px] border border-border/50 p-5 text-left transition-all hover:border-border hover:shadow-soft disabled:opacity-50 disabled:cursor-not-allowed"
      style={{ backgroundColor: "hsl(var(--card))" }}
    >
      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-500/10">
        <Icon className="h-[18px] w-[18px] text-blue-500" />
      </div>
      <div>
        <p className="text-sm font-semibold text-foreground">{title}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
      </div>
    </motion.button>
  );
}
