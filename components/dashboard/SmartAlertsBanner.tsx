"use client";

import { useMemo, useState, useCallback, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertTriangle,
  TrendingDown,
  Clock,
  Zap,
  Bell,
  X,
} from "lucide-react";
import { useEntitlements } from "@/hooks/use-entitlements";
import { analyzeSmartAlerts, type TradeInput, type SmartAlert } from "@/lib/smart-alerts";
import { supabase } from "@/lib/supabase/client";
import { useTranslations } from "next-intl";

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  AlertTriangle,
  TrendingDown,
  Clock,
  Zap,
};

const easeApple: [number, number, number, number] = [0.16, 1, 0.3, 1];

const DISMISSED_ALERTS_KEY = "dismissed-smart-alert-ids";

interface DismissalRecord {
  id: string;
  signature: string;
}

function dismissalKey(d: DismissalRecord): string {
  return `${d.id}::${d.signature}`;
}

function getDismissedFromCache(): DismissalRecord[] {
  try {
    const raw = localStorage.getItem(DISMISSED_ALERTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    // New format: [{id, signature}]. Old format: string[] — discard.
    const records: DismissalRecord[] = [];
    for (const item of parsed) {
      if (
        item &&
        typeof item === "object" &&
        typeof (item as DismissalRecord).id === "string" &&
        typeof (item as DismissalRecord).signature === "string"
      ) {
        records.push({
          id: (item as DismissalRecord).id,
          signature: (item as DismissalRecord).signature,
        });
      }
    }
    return records;
  } catch {
    return [];
  }
}

function saveDismissedToCache(records: DismissalRecord[]): void {
  try {
    localStorage.setItem(DISMISSED_ALERTS_KEY, JSON.stringify(records));
  } catch {}
}

interface SmartAlertsBannerProps {
  trades: TradeInput[];
  dailyDdLimit?: number | null;
  /**
   * Active account id. When provided, signatures become account-scoped so a
   * dismissal on Firm A does not silence the same alert on Firm B.
   */
  accountId?: string | null;
}

export function SmartAlertsBanner({ trades, dailyDdLimit, accountId }: SmartAlertsBannerProps) {
  const t = useTranslations("smartAlerts");
  const [dismissedKeys, setDismissedKeys] = useState<Set<string>>(() => {
    if (typeof window === "undefined") return new Set();
    return new Set(getDismissedFromCache().map(dismissalKey));
  });
  const [dismissError, setDismissError] = useState<string | null>(null);

  // On mount: pull server-side dismissals and merge with local cache.
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const token = sessionData.session?.access_token;
        if (!token) return;

        const res = await fetch("/api/smart-alerts/dismissals", {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        });
        if (!res.ok) return;
        const payload = await res.json();
        if (cancelled || !payload?.ok || !Array.isArray(payload.dismissals)) return;

        const serverRecords: DismissalRecord[] = payload.dismissals
          .filter(
            (d: unknown) =>
              d !== null &&
              typeof d === "object" &&
              typeof (d as { alert_id?: unknown }).alert_id === "string" &&
              typeof (d as { alert_signature?: unknown }).alert_signature === "string",
          )
          .map((d: { alert_id: string; alert_signature: string }) => ({
            id: d.alert_id,
            signature: d.alert_signature,
          }));

        // Merge server + local cache (union).
        const merged = new Map<string, DismissalRecord>();
        for (const r of getDismissedFromCache()) merged.set(dismissalKey(r), r);
        for (const r of serverRecords) merged.set(dismissalKey(r), r);

        const mergedList = Array.from(merged.values());
        saveDismissedToCache(mergedList);
        setDismissedKeys(new Set(mergedList.map(dismissalKey)));
      } catch {
        // Graceful degrade — keep localStorage-only state.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const allAlerts = useMemo(
    () => analyzeSmartAlerts({ trades, dailyDdLimit, accountId }),
    [trades, dailyDdLimit, accountId],
  );

  // Filter by (id + signature) — alert reappears when signature changes.
  const alerts = useMemo(
    () => allAlerts.filter((a) => !dismissedKeys.has(dismissalKey({ id: a.id, signature: a.signature }))),
    [allAlerts, dismissedKeys],
  );

  const handleDismiss = useCallback(async () => {
    if (alerts.length === 0) return;

    const newlyDismissed: DismissalRecord[] = alerts.map((a) => ({
      id: a.id,
      signature: a.signature,
    }));

    // Snapshot previous state for rollback.
    const previousKeys = new Set(dismissedKeys);
    const previousCache = getDismissedFromCache();

    // Optimistic local update.
    const nextKeys = new Set(dismissedKeys);
    for (const r of newlyDismissed) nextKeys.add(dismissalKey(r));
    setDismissedKeys(nextKeys);
    setDismissError(null);

    const cacheList = [...previousCache];
    for (const r of newlyDismissed) {
      if (!cacheList.some((c) => c.id === r.id && c.signature === r.signature)) {
        cacheList.push(r);
      }
    }
    saveDismissedToCache(cacheList);

    // Await POST per alert — check ok, rollback on failure.
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) throw new Error("missing_token");

      const results = await Promise.all(
        newlyDismissed.map((r) =>
          fetch("/api/smart-alerts/dismissals", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              alert_id: r.id,
              alert_signature: r.signature,
            }),
          }).catch(() => null),
        ),
      );

      const allOk = results.every((res) => res !== null && res.ok);
      if (!allOk) throw new Error("server_failed");
    } catch (err) {
      console.warn("[smart-alerts] dismissal sync failed", err);
      // Rollback optimistic state + cache.
      setDismissedKeys(previousKeys);
      saveDismissedToCache(previousCache);
      setDismissError(t("dismissFailed"));
      // Auto-clear error after 5s.
      setTimeout(() => setDismissError(null), 5000);
    }
  }, [dismissedKeys, alerts, t]);

  const visible = alerts.length > 0;

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

  // Subscription check: hide entirely for non-ultra (expensive feature, no teaser)
  const { plan: subPlan, isLoading: subLoading } = useEntitlements();
  const isUltraOrAbove = subPlan === "ultra" || subPlan === "mentor";
  if (!isUltraOrAbove && !subLoading) return null;

  return (
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

              {/* Dismiss error */}
              {dismissError && (
                <div
                  role="alert"
                  className="mx-5 mt-1 rounded-lg border border-red-300/60 bg-red-50 px-3 py-2 text-xs font-medium text-red-700 dark:border-red-500/40 dark:bg-red-950/40 dark:text-red-300"
                >
                  {dismissError}
                </div>
              )}

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
