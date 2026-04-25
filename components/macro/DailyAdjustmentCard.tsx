// components/macro/DailyAdjustmentCard.tsx
"use client";

import { useCallback, useEffect, useState } from "react";
import { RefreshCw, AlertCircle, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import type {
  DailyAdjustment,
  DailyAdjustmentAssetUpdate,
  DailyAdjustmentEvent,
  DailyAdjustmentHeadline,
  DailyAdjustmentItem,
} from "@/lib/macro/types";
import { isHeadlineItem } from "@/lib/macro/types";

interface DailyAdjustmentCardProps {
  weekStart: string;
  /** Called after a successful regeneration, so the parent can refetch asset impacts if they care. */
  onRegenerated?: (adjustment: DailyAdjustment) => void;
}

function renderParagraphs(text: string): React.ReactNode {
  return text
    .split(/\n{2,}|\n/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0)
    .map((p, i) => (
      <p key={i} className="text-[15px] leading-[1.7] text-muted-foreground">
        {p}
      </p>
    ));
}

function assetLabel(asset: string): string {
  switch (asset) {
    case "indices": return "Índices";
    case "gold": return "Ouro";
    case "btc": return "BTC";
    case "dollar": return "Dólar";
    default: return asset;
  }
}

function directionIcon(direction: DailyAdjustmentAssetUpdate["direction"]) {
  if (direction === "bullish") return <TrendingUp className="h-3 w-3 text-emerald-500" />;
  if (direction === "bearish") return <TrendingDown className="h-3 w-3 text-red-500" />;
  return <Minus className="h-3 w-3 text-muted-foreground" />;
}

export function DailyAdjustmentCard({ weekStart, onRegenerated }: DailyAdjustmentCardProps) {
  const [adjustment, setAdjustment] = useState<DailyAdjustment | null>(null);
  const [loading, setLoading] = useState(true);
  const [regenerating, setRegenerating] = useState(false);
  /** Error banner (amber box). Only used for hard errors, not for fallback notices. */
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  /** Soft notice chip under the header (fallback explanations). */
  const [notice, setNotice] = useState<string | null>(null);
  /** True when the initial fetch + a regenerate both indicate no weekly panorama exists. */
  const [noWeeklyPanorama, setNoWeeklyPanorama] = useState(false);

  const fetchLatest = useCallback(async () => {
    try {
      const res = await fetch(`/api/macro/daily-adjustment/latest?week=${weekStart}`);
      const json = await res.json();
      if (json.ok) setAdjustment(json.data || null);
    } catch (err) {
      console.warn("[daily-adjustment] fetch failed:", err);
    } finally {
      setLoading(false);
    }
  }, [weekStart]);

  useEffect(() => {
    fetchLatest();
  }, [fetchLatest]);

  // When the fetched (non-fallback) adjustment is itself a weekly_fallback row, surface
  // the same notice chip even without a manual regenerate — the user still needs to know
  // why there are no red lines attached.
  useEffect(() => {
    if (!adjustment) return;
    const isWeeklyFallback =
      adjustment.source === "weekly_fallback" ||
      (Array.isArray(adjustment.based_on_events) && adjustment.based_on_events.length === 0);
    if (isWeeklyFallback && !notice) {
      setNotice(
        adjustment.source === "weekly_fallback"
          ? "Sem red lines nem headlines novas — baseado no panorama semanal vigente."
          : "Sem red lines nem headlines novas — mantendo o ajuste anterior.",
      );
    }
  }, [adjustment, notice]);

  const handleRegenerate = useCallback(async () => {
    if (regenerating) return;
    setErrorMessage(null);
    setNotice(null);
    setRegenerating(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setErrorMessage("Sessão expirada. Faça login novamente.");
        return;
      }
      const res = await fetch("/api/macro/daily-adjustment/regenerate", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        if (json.reason === "no_weekly_panorama") {
          setNoWeeklyPanorama(true);
        }
        setErrorMessage(json.error || "Erro ao regenerar ajuste diário.");
        return;
      }
      setAdjustment(json.adjustment);
      if (json.notice) setNotice(json.notice);
      onRegenerated?.(json.adjustment);
    } catch (err) {
      console.error("[daily-adjustment] regenerate failed:", err);
      setErrorMessage("Erro de conexão ao regenerar.");
    } finally {
      setRegenerating(false);
    }
  }, [regenerating, onRegenerated]);

  const formatTs = (iso: string | undefined | null) => {
    if (!iso) return "";
    try {
      return new Date(iso).toLocaleString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return "";
    }
  };

  const assetUpdates = adjustment?.asset_updates
    ? Object.entries(adjustment.asset_updates).filter(([, v]) => v)
    : [];

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
          <RefreshCw className="h-4 w-4" />
          Ajuste Diário
          <span className="text-[10px] font-medium normal-case tracking-normal text-muted-foreground/70">
            — releases e headlines vs viés semanal
          </span>
        </h3>
        <div className="flex items-center gap-3">
          {adjustment?.generated_at && (
            <span className="text-[10px] text-muted-foreground">
              {formatTs(adjustment.generated_at)}
            </span>
          )}
          <button
            onClick={handleRegenerate}
            disabled={regenerating}
            className={cn(
              "flex items-center gap-1.5 text-[11px] font-semibold text-blue-500 hover:text-blue-600 transition-colors disabled:opacity-50"
            )}
          >
            {regenerating && <RefreshCw className="h-3 w-3 animate-spin" />}
            {regenerating ? "Gerando..." : "Regenerar"}
          </button>
        </div>
      </div>

      {notice && (
        <div className="mb-3">
          <span className="inline-flex items-center rounded-full bg-amber-500/10 px-2.5 py-0.5 text-[10px] font-medium text-amber-600">
            {notice}
          </span>
        </div>
      )}

      {errorMessage && (
        <div className="mb-3 flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2">
          <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
          <p className="text-xs text-amber-700 dark:text-amber-400">{errorMessage}</p>
        </div>
      )}

      {loading ? (
        <div className="h-16 animate-pulse rounded-lg bg-muted/40" />
      ) : adjustment ? (
        <>
          {adjustment.based_on_events && adjustment.based_on_events.length > 0 && (
            <div className="mb-3 flex flex-wrap gap-1.5">
              {(adjustment.based_on_events as DailyAdjustmentItem[]).slice(0, 10).map((item, idx) => {
                if (isHeadlineItem(item)) {
                  const h = item as DailyAdjustmentHeadline;
                  const src = h.source === "truth_social" ? "TRUMP" : h.source.toUpperCase();
                  return (
                    <span
                      key={`h-${idx}`}
                      className="inline-flex items-center gap-1.5 rounded-full border border-blue-500/20 bg-blue-500/5 px-2.5 py-1 text-[10px] font-medium text-blue-600 dark:text-blue-400"
                      title={h.summary || h.headline}
                    >
                      <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                      <span className="font-semibold">{src}</span>
                      <span className="truncate max-w-[200px]">{h.headline}</span>
                    </span>
                  );
                }
                const e = item as DailyAdjustmentEvent;
                return (
                  <span
                    key={`e-${e.event_uid || idx}`}
                    className="inline-flex items-center gap-1.5 rounded-full border border-red-500/20 bg-red-500/5 px-2.5 py-1 text-[10px] font-medium text-red-600 dark:text-red-400"
                    title={`${e.title} — Forecast: ${e.forecast || "N/A"} | Actual: ${e.actual || "—"}`}
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
                    <span className="font-semibold">{e.country}</span>
                    <span className="truncate max-w-[140px]">{e.title}</span>
                    <span className="text-foreground/80">{e.actual || "—"}</span>
                  </span>
                );
              })}
            </div>
          )}

          <div className="space-y-3 break-words">
            {renderParagraphs(adjustment.narrative)}
          </div>

          {assetUpdates.length > 0 && (
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2">
              {assetUpdates.map(([asset, update]) => (
                <div
                  key={asset}
                  className="flex items-start gap-2 rounded-lg border border-border/40 px-3 py-2"
                  style={{ backgroundColor: "hsl(var(--card))" }}
                >
                  <div className="mt-0.5">{directionIcon(update!.direction)}</div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-foreground">
                      {assetLabel(asset)} → {update!.direction}
                    </p>
                    <p className="text-[11px] leading-relaxed text-muted-foreground">
                      {update!.delta_note}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      ) : (
        <p className="text-sm text-muted-foreground italic">
          {noWeeklyPanorama
            ? "Gere o briefing semanal primeiro para habilitar o ajuste diário."
            : "Carregando ajuste diário…"}
        </p>
      )}
    </div>
  );
}
