"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, X, ShieldAlert } from "lucide-react";
import { useLiveMonitoringSafe } from "@/components/context/LiveMonitoringContext";
import { supabase } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

const easeApple: [number, number, number, number] = [0.16, 1, 0.3, 1];

export function LiveAlertsBanner() {
  const monitoring = useLiveMonitoringSafe();
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  if (!monitoring || !monitoring.isConnected) return null;

  const visibleAlerts = monitoring.activeAlerts.filter((a) => !dismissed.has(a.id));
  if (visibleAlerts.length === 0) return null;

  function handleDismiss(alertId: string) {
    setDismissed((prev) => {
      const next = new Set(prev);
      next.add(alertId);
      return next;
    });

    // Dismiss in DB (fire-and-forget)
    supabase
      .from("live_alerts_log")
      .update({ dismissed: true })
      .eq("id", alertId)
      .then();
  }

  return (
    <AnimatePresence>
      {visibleAlerts.map((alert) => {
        const isCritical = alert.severity === "critical" || alert.severity === "breach";
        return (
          <motion.div
            key={alert.id}
            initial={{ opacity: 0, y: -8, height: 0 }}
            animate={{ opacity: 1, y: 0, height: "auto" }}
            exit={{ opacity: 0, y: -8, height: 0 }}
            transition={{ duration: 0.3, ease: easeApple }}
            className={cn(
              "rounded-[16px] border p-4 flex items-start gap-3 mb-3",
              isCritical
                ? "border-red-300 dark:border-red-800 bg-red-50 dark:bg-red-950/40"
                : "border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/40"
            )}
          >
            {isCritical ? (
              <ShieldAlert className="h-5 w-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5 animate-pulse" />
            ) : (
              <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            )}
            <div className="flex-1 min-w-0">
              <p
                className={cn(
                  "text-sm font-medium",
                  isCritical
                    ? "text-red-800 dark:text-red-300"
                    : "text-amber-800 dark:text-amber-300"
                )}
              >
                {isCritical ? "Alerta Crítico" : "Atenção"}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">{alert.message}</p>
            </div>
            <button
              onClick={() => handleDismiss(alert.id)}
              className="rounded-full p-1 text-muted-foreground hover:text-foreground transition-colors shrink-0"
            >
              <X className="h-4 w-4" />
            </button>
          </motion.div>
        );
      })}
    </AnimatePresence>
  );
}
