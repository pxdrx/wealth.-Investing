// components/macro/AdaptiveAlerts.tsx
"use client";

import { AlertTriangle, TrendingUp, Clock } from "lucide-react";
import type { AdaptiveAlert } from "@/lib/macro/types";

interface AdaptiveAlertsProps {
  alerts: AdaptiveAlert[];
}

const ALERT_CONFIG = {
  breaking: {
    icon: AlertTriangle,
    bg: "bg-red-500/10 border-red-500/20",
    text: "text-red-500",
    label: "BREAKING",
  },
  update: {
    icon: TrendingUp,
    bg: "bg-orange-500/10 border-orange-500/20",
    text: "text-orange-500",
    label: "ATUALIZAÇÃO",
  },
  upcoming: {
    icon: Clock,
    bg: "bg-blue-500/10 border-blue-500/20",
    text: "text-blue-500",
    label: "EM BREVE",
  },
} as const;

export function AdaptiveAlerts({ alerts }: AdaptiveAlertsProps) {
  if (!alerts.length) return null;

  return (
    <div className="space-y-3">
      {alerts.map((alert) => {
        const config = ALERT_CONFIG[alert.type];
        const Icon = config.icon;
        return (
          <div
            key={alert.id}
            className={`flex items-start gap-3 rounded-[16px] border p-4 ${config.bg}`}
          >
            <Icon className={`mt-0.5 h-5 w-5 shrink-0 ${config.text}`} />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className={`text-[10px] font-bold uppercase tracking-wider ${config.text}`}>
                  {config.label}
                </span>
                <span className="text-[10px] text-muted-foreground">
                  {new Date(alert.created_at).toLocaleString("pt-BR", {
                    day: "2-digit",
                    month: "2-digit",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
              <p className="mt-1 text-sm font-medium">{alert.title}</p>
              {alert.description && (
                <p className="mt-1 text-xs text-muted-foreground">{alert.description}</p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
