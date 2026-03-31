"use client";

import { useMemo, useState, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertTriangle,
  TrendingDown,
  Clock,
  Zap,
  Bell,
  X,
} from "lucide-react";
import { PaywallGate } from "@/components/billing/PaywallGate";
import { analyzeSmartAlerts, type TradeInput, type SmartAlert } from "@/lib/smart-alerts";

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  AlertTriangle,
  TrendingDown,
  Clock,
  Zap,
};

const easeApple: [number, number, number, number] = [0.16, 1, 0.3, 1];

function getDismissKey(): string {
  const d = new Date();
  const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  return `dismissed-smart-alerts-${dateStr}`;
}

function isDismissed(): boolean {
  try {
    return sessionStorage.getItem(getDismissKey()) === "1";
  } catch {
    return false;
  }
}

interface SmartAlertsBannerProps {
  trades: TradeInput[];
  dailyDdLimit?: number | null;
}

export function SmartAlertsBanner({ trades, dailyDdLimit }: SmartAlertsBannerProps) {
  const [dismissed, setDismissed] = useState(() => isDismissed());

  const alerts = useMemo(
    () => analyzeSmartAlerts({ trades, dailyDdLimit }),
    [trades, dailyDdLimit],
  );

  const handleDismiss = useCallback(() => {
    setDismissed(true);
    try {
      sessionStorage.setItem(getDismissKey(), "1");
    } catch {
      // ignore
    }
  }, []);

  const visible = alerts.length > 0 && !dismissed;

  const highestSeverity = alerts.some((a) => a.severity === "danger") ? "danger" : "warning";

  const borderColor =
    highestSeverity === "danger"
      ? "border-red-400/60 dark:border-red-500/40"
      : "border-amber-400/60 dark:border-amber-500/40";

  const gradientBg =
    highestSeverity === "danger"
      ? "from-red-50/80 to-red-100/40 dark:from-red-950/30 dark:to-red-900/10"
      : "from-amber-50/80 to-amber-100/40 dark:from-amber-950/30 dark:to-amber-900/10";

  const headerColor =
    highestSeverity === "danger"
      ? "text-red-700 dark:text-red-400"
      : "text-amber-700 dark:text-amber-400";

  const bellBg =
    highestSeverity === "danger"
      ? "bg-red-100 dark:bg-red-900/30"
      : "bg-amber-100 dark:bg-amber-900/30";

  return (
    <PaywallGate requiredPlan="ultra" blurContent>
      <AnimatePresence>
        {visible && (
          <motion.div
            key="smart-alerts-banner"
            initial={{ opacity: 0, height: 0, marginBottom: 0 }}
            animate={{ opacity: 1, height: "auto", marginBottom: 24 }}
            exit={{ opacity: 0, height: 0, marginBottom: 0 }}
            transition={{ duration: 0.4, ease: easeApple }}
            className="xl:col-span-12"
          >
            <div
              className={`relative overflow-hidden rounded-[22px] border ${borderColor} bg-gradient-to-br ${gradientBg} shadow-soft dark:shadow-soft-dark`}
              style={{ backgroundColor: "hsl(var(--card))" }}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-5 pt-4 pb-2">
                <div className="flex items-center gap-2.5">
                  <div className={`flex h-8 w-8 items-center justify-center rounded-full ${bellBg}`}>
                    <Bell className={`h-4 w-4 ${headerColor}`} />
                  </div>
                  <h3 className={`text-sm font-semibold tracking-tight ${headerColor}`}>
                    Alertas Inteligentes
                  </h3>
                  <span className="rounded-full bg-foreground/10 px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                    {alerts.length}
                  </span>
                </div>
                <button
                  onClick={handleDismiss}
                  className="flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
                  title="Dispensar por hoje"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Alert rows */}
              <div className="flex flex-col gap-1 px-5 pb-4 pt-1">
                {alerts.map((alert) => (
                  <AlertRow key={alert.id} alert={alert} />
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </PaywallGate>
  );
}

function AlertRow({ alert }: { alert: SmartAlert }) {
  const IconComponent = ICON_MAP[alert.icon] ?? AlertTriangle;

  const iconColor =
    alert.severity === "danger"
      ? "text-red-500 dark:text-red-400"
      : "text-amber-500 dark:text-amber-400";

  const dotColor =
    alert.severity === "danger" ? "bg-red-500" : "bg-amber-500";

  return (
    <div className="flex items-start gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-foreground/[0.03]">
      <div className="mt-0.5 flex-shrink-0">
        <IconComponent className={`h-4 w-4 ${iconColor}`} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className={`h-1.5 w-1.5 rounded-full ${dotColor} flex-shrink-0`} />
          <p className="text-sm font-medium tracking-tight text-foreground truncate">
            {alert.title}
          </p>
        </div>
        <p className="mt-0.5 text-xs text-muted-foreground leading-relaxed">
          {alert.message}
        </p>
      </div>
    </div>
  );
}
