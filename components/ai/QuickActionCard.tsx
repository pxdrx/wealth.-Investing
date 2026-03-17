"use client";

import { type LucideIcon } from "lucide-react";

interface QuickActionCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
  onClick: () => void;
  disabled?: boolean;
}

export function QuickActionCard({ icon: Icon, title, description, onClick, disabled }: QuickActionCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex flex-col items-start gap-2 rounded-[22px] p-5 text-left transition-shadow hover:shadow-soft disabled:opacity-50 disabled:cursor-not-allowed"
      style={{ backgroundColor: "hsl(var(--card))" }}
    >
      <Icon className="h-5 w-5 text-muted-foreground" />
      <div>
        <p className="text-sm font-semibold text-foreground">{title}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
    </button>
  );
}
