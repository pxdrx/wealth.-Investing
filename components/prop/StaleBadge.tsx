"use client";

import { Clock } from "lucide-react";

interface StaleBadgeProps {
  lastTradeAt: string | null;
}

function getRelativeTime(dateStr: string): { label: string; hoursAgo: number } {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const diffMin = Math.floor(diffMs / 60_000);
  const diffHours = Math.floor(diffMs / 3_600_000);
  const diffDays = Math.floor(diffMs / 86_400_000);

  if (diffMin < 1) return { label: "agora", hoursAgo: 0 };
  if (diffMin < 60) return { label: `há ${diffMin} min`, hoursAgo: diffMin / 60 };
  if (diffHours < 24) return { label: `há ${diffHours} hora${diffHours > 1 ? "s" : ""}`, hoursAgo: diffHours };
  return { label: `há ${diffDays} dia${diffDays > 1 ? "s" : ""}`, hoursAgo: diffHours };
}

export function StaleBadge({ lastTradeAt }: StaleBadgeProps) {
  if (!lastTradeAt) {
    return (
      <span
        className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium"
        style={{
          backgroundColor: "hsl(var(--muted))",
          color: "hsl(var(--muted-foreground))",
        }}
      >
        <Clock className="h-3 w-3" />
        Sem dados
      </span>
    );
  }

  const { label, hoursAgo } = getRelativeTime(lastTradeAt);

  let bgColor: string;
  let textColor: string;

  if (hoursAgo >= 72) {
    // Red — stale > 72h
    bgColor = "hsl(0 84% 60% / 0.15)";
    textColor = "hsl(0 84% 40%)";
  } else if (hoursAgo >= 24) {
    // Yellow — warning > 24h
    bgColor = "hsl(45 93% 47% / 0.15)";
    textColor = "hsl(45 93% 30%)";
  } else {
    // Green — recent
    bgColor = "hsl(142 71% 45% / 0.15)";
    textColor = "hsl(142 71% 28%)";
  }

  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium"
      style={{ backgroundColor: bgColor, color: textColor }}
    >
      <Clock className="h-3 w-3" />
      Última atualização: {label}
    </span>
  );
}
