// components/macro/AdaptiveAlerts.tsx
"use client";

import { useCallback, useMemo, useState } from "react";
import { AlertTriangle, TrendingUp, Clock, X } from "lucide-react";
import type { AdaptiveAlert } from "@/lib/macro/types";
import { cn } from "@/lib/utils";

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

const DISMISSED_KEY = "adaptive-alerts-dismissed";
const MAX_VISIBLE = 3;

/** Normalise title for dedup: lowercase, strip accents/punct, collapse spaces. */
function norm(t: string): string {
  return t
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Two titles with >= 60% shared words are considered duplicates. */
function areSimilar(a: string, b: string): boolean {
  const wa = norm(a).split(" ").filter(Boolean);
  const wb = new Set(norm(b).split(" ").filter(Boolean));
  if (wa.length === 0 || wb.size === 0) return false;
  const common = wa.filter((w) => wb.has(w)).length;
  return common / Math.min(wa.length, wb.size) >= 0.6;
}

/** Deduplicate alerts by title similarity, keeping most recent. */
function dedup(alerts: AdaptiveAlert[]): AdaptiveAlert[] {
  const kept: AdaptiveAlert[] = [];
  for (const a of alerts) {
    const isDup = kept.some((k) => areSimilar(k.title, a.title));
    if (!isDup) kept.push(a);
  }
  return kept;
}

function getLocalDismissals(): Set<string> {
  try {
    const raw = localStorage.getItem(DISMISSED_KEY);
    if (!raw) return new Set();
    return new Set(JSON.parse(raw) as string[]);
  } catch {
    return new Set();
  }
}

function persistDismissal(id: string) {
  try {
    const existing = getLocalDismissals();
    existing.add(id);
    const arr = Array.from(existing).slice(-200);
    localStorage.setItem(DISMISSED_KEY, JSON.stringify(arr));
  } catch { /* ignore */ }
}

export function AdaptiveAlerts({ alerts }: AdaptiveAlertsProps) {
  const [dismissed, setDismissed] = useState<Set<string>>(() => {
    if (typeof window === "undefined") return new Set();
    return getLocalDismissals();
  });
  const [animatingOut, setAnimatingOut] = useState<Set<string>>(new Set());

  // Filter dismissed, deduplicate, limit.
  const visible = useMemo(() => {
    const filtered = alerts.filter((a) => !dismissed.has(a.id));
    return dedup(filtered).slice(0, MAX_VISIBLE);
  }, [alerts, dismissed]);

  const handleDismiss = useCallback((id: string) => {
    // Start exit animation.
    setAnimatingOut((prev) => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });
    persistDismissal(id);

    // After animation completes, remove from state.
    setTimeout(() => {
      setAnimatingOut((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      setDismissed((prev) => {
        const next = new Set(prev);
        next.add(id);
        return next;
      });
    }, 300);
  }, []);

  const handleDismissAll = useCallback(() => {
    for (const a of visible) {
      persistDismissal(a.id);
    }
    // Animate all out.
    const ids = visible.map((a) => a.id);
    setAnimatingOut(new Set(ids));

    setTimeout(() => {
      setAnimatingOut(new Set());
      setDismissed((prev) => {
        const next = new Set(prev);
        for (const id of ids) next.add(id);
        return next;
      });
    }, 300);
  }, [visible]);

  if (visible.length === 0) return null;

  return (
    <div className="space-y-2">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
          Alertas Adaptativos
          {visible.length > 1 && (
            <span className="ml-2 text-muted-foreground/50 tabular-nums">
              {visible.length}
            </span>
          )}
        </h3>
        {visible.length > 1 && (
          <button
            type="button"
            onClick={handleDismissAll}
            className="text-[10px] text-muted-foreground hover:text-foreground transition-colors uppercase tracking-wider font-medium px-2 py-1 rounded-lg hover:bg-muted/50"
          >
            Dispensar tudo
          </button>
        )}
      </div>

      {/* Alert items */}
      {visible.map((alert) => {
        const config = ALERT_CONFIG[alert.type];
        const Icon = config.icon;
        const isExiting = animatingOut.has(alert.id);
        return (
          <div
            key={alert.id}
            className={cn(
              "group relative flex items-start gap-3 rounded-[16px] border p-4 transition-all duration-300",
              config.bg,
              isExiting && "opacity-0 -translate-x-4 scale-95 pointer-events-none",
            )}
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
            <button
              type="button"
              onClick={() => handleDismiss(alert.id)}
              aria-label="Dispensar alerta"
              className="shrink-0 rounded-full p-1.5 text-muted-foreground hover:bg-foreground/10 hover:text-foreground transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
