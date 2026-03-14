"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import {
  Card,
  CardContent,
  CardHeader,
} from "@/components/ui/card";
import { Bell, ChevronDown, ChevronUp, AlertTriangle } from "lucide-react";

interface TvAlert {
  id: string;
  user_id: string;
  symbol: string;
  alert_type: string;
  timeframe: string | null;
  message: string | null;
  payload: Record<string, unknown> | null;
  created_at: string;
}

interface GroupedAlert {
  key: string;
  symbol: string;
  alert_type: string;
  timeframe: string | null;
  count: number;
  most_recent: Date;
  alerts: TvAlert[];
}

function timeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return "agora";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `há ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `há ${hours}h`;
  const days = Math.floor(hours / 24);
  return `há ${days}d`;
}

function formatAlertType(type: string): string {
  return type
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function groupAlerts(alerts: TvAlert[]): GroupedAlert[] {
  const map = new Map<string, GroupedAlert>();

  for (const alert of alerts) {
    const key = `${alert.symbol}::${alert.alert_type}`;
    const existing = map.get(key);
    const createdAt = new Date(alert.created_at);

    if (existing) {
      existing.count += 1;
      existing.alerts.push(alert);
      if (createdAt > existing.most_recent) {
        existing.most_recent = createdAt;
        existing.timeframe = alert.timeframe;
      }
    } else {
      map.set(key, {
        key,
        symbol: alert.symbol,
        alert_type: alert.alert_type,
        timeframe: alert.timeframe,
        count: 1,
        most_recent: createdAt,
        alerts: [alert],
      });
    }
  }

  const groups = Array.from(map.values());
  groups.sort((a, b) => b.most_recent.getTime() - a.most_recent.getTime());
  return groups;
}

export default function AlertsPage() {
  const [groups, setGroups] = useState<GroupedAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedKeys, setExpandedKeys] = useState<Set<string>>(new Set());

  useEffect(() => {
    async function fetchAlerts() {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session) {
          setError("Sessao nao encontrada.");
          setLoading(false);
          return;
        }

        const { data, error: queryError } = await supabase
          .from("tv_alerts")
          .select("*")
          .eq("user_id", session.user.id)
          .order("created_at", { ascending: false });

        if (queryError) {
          setError(queryError.message);
          setLoading(false);
          return;
        }

        setGroups(groupAlerts((data as TvAlert[]) ?? []));
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Erro ao carregar alertas."
        );
      } finally {
        setLoading(false);
      }
    }

    fetchAlerts();
  }, []);

  function toggleExpanded(key: string) {
    setExpandedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }

  return (
    <div className="mx-auto max-w-4xl px-6 py-12">
      <h1 className="text-2xl font-semibold tracking-tight text-foreground">
        Alertas
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Alertas recebidos via TradingView webhooks.
      </p>

      <div className="mt-8 space-y-4">
        {loading && <LoadingSkeleton />}

        {!loading && error && (
          <Card
            className="rounded-[22px]"
            style={{ backgroundColor: "hsl(var(--card))" }}
          >
            <CardContent className="flex items-center gap-3 py-6">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              <p className="text-sm text-destructive">{error}</p>
            </CardContent>
          </Card>
        )}

        {!loading && !error && groups.length === 0 && (
          <Card
            className="rounded-[22px]"
            style={{ backgroundColor: "hsl(var(--card))" }}
          >
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <Bell className="h-10 w-10 text-muted-foreground/40" />
              <p className="mt-4 text-sm text-muted-foreground">
                Nenhum alerta recebido ainda.
              </p>
              <p className="mt-1 text-xs text-muted-foreground/60">
                Configure webhooks no TradingView para receber alertas aqui.
              </p>
            </CardContent>
          </Card>
        )}

        {!loading &&
          !error &&
          groups.map((group) => {
            const isExpanded = expandedKeys.has(group.key);
            return (
              <Card
                key={group.key}
                className="rounded-[22px] overflow-hidden"
                style={{ backgroundColor: "hsl(var(--card))" }}
              >
                <CardHeader className="pb-0">
                  <button
                    type="button"
                    onClick={() => toggleExpanded(group.key)}
                    className="flex w-full items-center justify-between text-left"
                  >
                    <div className="flex items-center gap-3">
                      <Bell className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-base font-semibold text-foreground">
                            {group.symbol}
                          </span>
                          {group.count > 1 && (
                            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                              {group.count}x
                            </span>
                          )}
                        </div>
                        <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                          <span>{formatAlertType(group.alert_type)}</span>
                          {group.timeframe && (
                            <>
                              <span className="text-muted-foreground/40">
                                ·
                              </span>
                              <span>{group.timeframe}</span>
                            </>
                          )}
                          <span className="text-muted-foreground/40">·</span>
                          <span>{timeAgo(group.most_recent)}</span>
                        </div>
                      </div>
                    </div>
                    {isExpanded ? (
                      <ChevronUp className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    )}
                  </button>
                </CardHeader>

                {isExpanded && (
                  <CardContent className="pt-4">
                    <div className="space-y-3">
                      {group.alerts.map((alert) => (
                        <div
                          key={alert.id}
                          className="rounded-xl border border-border/50 px-4 py-3"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-muted-foreground">
                              {timeAgo(new Date(alert.created_at))}
                            </span>
                            {alert.timeframe && (
                              <span className="text-xs text-muted-foreground">
                                {alert.timeframe}
                              </span>
                            )}
                          </div>
                          {alert.message && (
                            <p className="mt-1.5 text-sm text-foreground/80">
                              {alert.message}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                )}
              </Card>
            );
          })}
      </div>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <>
      {[1, 2, 3].map((i) => (
        <Card
          key={i}
          className="rounded-[22px]"
          style={{ backgroundColor: "hsl(var(--card))" }}
        >
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="h-4 w-4 animate-pulse rounded bg-muted" />
              <div className="space-y-2">
                <div className="h-4 w-24 animate-pulse rounded bg-muted" />
                <div className="h-3 w-40 animate-pulse rounded bg-muted" />
              </div>
            </div>
          </CardHeader>
        </Card>
      ))}
    </>
  );
}
