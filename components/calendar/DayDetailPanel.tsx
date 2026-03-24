"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { StickyNote, Save, Check } from "lucide-react";
import type { DayData, DayNote } from "./types";
import { formatPnl } from "./utils";
import { usePrivacy } from "@/components/context/PrivacyContext";
import { supabase } from "@/lib/supabase/client";

interface DayDetailPanelProps {
  selectedDate: string | null;
  dayData: DayData | null;
  dayNote: DayNote | null;
  showConsolidatedToggle?: boolean;
  userId?: string | null;
  onNoteSaved?: (date: string, note: DayNote) => void;
}

function formatDateLabel(dateStr: string): string {
  const [year, month, day] = dateStr.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  return date
    .toLocaleDateString("pt-BR", { day: "numeric", month: "short" })
    .replace(".", "");
}

export function DayDetailPanel({
  selectedDate,
  dayData,
  dayNote,
  showConsolidatedToggle,
  userId,
  onNoteSaved,
}: DayDetailPanelProps) {
  const { mask } = usePrivacy();
  const [viewMode, setViewMode] = useState<"consolidated" | "per-account">(
    "consolidated"
  );

  // Editable note state
  const [observation, setObservation] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [noteId, setNoteId] = useState<string | null>(null);

  // Sync local state when selectedDate or dayNote changes
  useEffect(() => {
    setObservation(dayNote?.observation ?? "");
    setTags(dayNote?.tags ?? []);
    setTagInput("");
    setSaved(false);
    setNoteId(null);
  }, [selectedDate, dayNote]);

  const addTag = useCallback(() => {
    const tag = tagInput.trim().toLowerCase();
    if (tag && !tags.includes(tag)) {
      setTags((prev) => [...prev, tag]);
      setTagInput("");
      setSaved(false);
    }
  }, [tagInput, tags]);

  const removeTag = useCallback((tag: string) => {
    setTags((prev) => prev.filter((t) => t !== tag));
    setSaved(false);
  }, []);

  const handleSave = useCallback(async () => {
    if (!userId || !selectedDate) return;
    setSaving(true);
    setSaved(false);
    try {
      const notePayload = {
        user_id: userId,
        date: selectedDate,
        observation: observation.trim(),
        tags: tags.length > 0 ? tags : null,
        updated_at: new Date().toISOString(),
      };

      // Upsert: try update first, then insert
      const { data: existing } = await supabase
        .from("day_notes")
        .select("id")
        .eq("user_id", userId)
        .eq("date", selectedDate)
        .maybeSingle();

      if (existing) {
        await supabase
          .from("day_notes")
          .update({
            observation: notePayload.observation,
            tags: notePayload.tags,
            updated_at: notePayload.updated_at,
          })
          .eq("id", existing.id);
        setNoteId(existing.id);
      } else if (notePayload.observation || (notePayload.tags && notePayload.tags.length > 0)) {
        const { data: inserted } = await supabase
          .from("day_notes")
          .insert(notePayload)
          .select("id")
          .maybeSingle();
        if (inserted) setNoteId(inserted.id);
      }

      setSaved(true);
      onNoteSaved?.(selectedDate, { observation: notePayload.observation, tags: notePayload.tags });

      // Reset saved indicator after 2s
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      console.error("[day-notes] Save error:", err);
    } finally {
      setSaving(false);
    }
  }, [userId, selectedDate, observation, tags, onNoteSaved]);

  const hasChanges = useMemo(() => {
    const origObs = dayNote?.observation ?? "";
    const origTags = dayNote?.tags ?? [];
    return observation !== origObs || JSON.stringify(tags) !== JSON.stringify(origTags);
  }, [observation, tags, dayNote]);

  const avgRR = useMemo(() => {
    if (!dayData || dayData.wins === 0 || dayData.losses === 0) {
      if (dayData && dayData.wins > 0 && dayData.losses === 0) return Infinity;
      return 0;
    }
    const avgWin = dayData.totalWinAmount / dayData.wins;
    const avgLoss = dayData.totalLossAmount / dayData.losses;
    return avgLoss > 0 ? avgWin / avgLoss : 0;
  }, [dayData]);

  const pnlColor = (value: number) =>
    value > 0
      ? "hsl(var(--pnl-positive))"
      : value < 0
        ? "hsl(var(--pnl-negative))"
        : "hsl(var(--landing-text-muted))";

  if (!selectedDate) {
    return (
      <div
        className="lg:w-[280px] border-t lg:border-t-0 lg:border-l p-4 md:p-5 flex items-center justify-center"
        style={{ borderColor: "hsl(var(--landing-border))" }}
      >
        <p className="text-xs text-center text-muted-foreground">
          Selecione um dia para ver detalhes.
        </p>
      </div>
    );
  }

  return (
    <div
      className="lg:w-[280px] border-t lg:border-t-0 lg:border-l p-4 md:p-5 flex flex-col gap-4 overflow-y-auto"
      style={{ borderColor: "hsl(var(--landing-border))" }}
    >
      {/* Header */}
      <div className="flex items-baseline justify-between">
        <span className="text-[10px] uppercase tracking-wider font-medium text-muted-foreground">
          {formatDateLabel(selectedDate)}
        </span>
        <span
          className="text-base font-semibold tabular-nums"
          style={{
            color: dayData ? pnlColor(dayData.totalPnl) : "hsl(var(--landing-text-muted))",
          }}
        >
          {mask(dayData ? formatPnl(dayData.totalPnl) : "$0")}
        </span>
      </div>

      {/* KPIs 2x2 */}
      <div className="grid grid-cols-2 gap-2">
        {[
          {
            label: "Trades",
            value: dayData?.tradeCount?.toString() ?? "0",
            color: "hsl(var(--landing-text))",
          },
          {
            label: "RR Médio",
            value: avgRR === Infinity ? "∞" : avgRR > 0 ? avgRR.toFixed(2) : "0",
            color: "hsl(var(--landing-text))",
          },
          {
            label: "Melhor",
            value: dayData && dayData.bestTrade !== 0 ? formatPnl(dayData.bestTrade) : "$0",
            color: dayData && dayData.bestTrade > 0 ? "hsl(var(--pnl-positive))" : "hsl(var(--landing-text-muted))",
          },
          {
            label: "Pior",
            value: dayData && dayData.worstTrade !== 0 ? formatPnl(dayData.worstTrade) : "$0",
            color: dayData && dayData.worstTrade < 0 ? "hsl(var(--pnl-negative))" : "hsl(var(--landing-text-muted))",
          },
        ].map((kpi) => (
          <div
            key={kpi.label}
            className="rounded-lg p-2.5"
            style={{
              backgroundColor: "hsl(var(--landing-bg-tertiary))",
            }}
          >
            <p className="text-[9px] uppercase tracking-wider mb-1 text-muted-foreground">
              {kpi.label}
            </p>
            <p
              className="text-[13px] font-semibold tabular-nums"
              style={{ color: kpi.color }}
            >
              {mask(kpi.value)}
            </p>
          </div>
        ))}
      </div>

      {/* No trades message */}
      {dayData?.tradeCount === 0 && (
        <p className="text-center py-2 text-[11px] text-muted-foreground">
          Sem operações neste dia
        </p>
      )}

      {/* Editable observation */}
      {userId ? (
        <div>
          <p className="text-[9px] uppercase tracking-wider mb-1.5 text-muted-foreground flex items-center gap-1">
            <StickyNote className="h-3 w-3" />
            Observacao do dia
          </p>
          <textarea
            value={observation}
            onChange={(e) => { setObservation(e.target.value); setSaved(false); }}
            placeholder="Como foi o dia? Licoes aprendidas..."
            rows={3}
            className="w-full rounded-lg border border-border/40 bg-transparent px-2.5 py-2 text-[11px] leading-relaxed focus:outline-none focus:ring-1 focus:ring-ring resize-none"
            style={{ color: "hsl(var(--landing-text))" }}
          />
        </div>
      ) : (
        dayNote?.observation && (
          <div>
            <p className="text-[9px] uppercase tracking-wider mb-1.5 text-muted-foreground">
              Observacoes
            </p>
            <p
              className="text-[11px] leading-relaxed"
              style={{ color: "hsl(var(--landing-text))" }}
            >
              {dayNote.observation}
            </p>
          </div>
        )
      )}

      {/* Tags */}
      {userId && (
        <div>
          <p className="text-[9px] uppercase tracking-wider mb-1.5 text-muted-foreground">
            Tags
          </p>
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-2">
              {tags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[10px] font-medium"
                  style={{ backgroundColor: "hsl(var(--landing-bg-tertiary))", color: "hsl(var(--landing-text))" }}
                >
                  {tag}
                  <button
                    onClick={() => removeTag(tag)}
                    className="ml-0.5 hover:text-red-500 transition-colors text-[10px]"
                  >
                    x
                  </button>
                </span>
              ))}
            </div>
          )}
          <div className="flex gap-1.5">
            <input
              type="text"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTag(); } }}
              placeholder="Adicionar tag..."
              className="flex-1 rounded-lg border border-border/40 bg-transparent px-2.5 py-1.5 text-[11px] focus:outline-none focus:ring-1 focus:ring-ring"
              style={{ color: "hsl(var(--landing-text))" }}
            />
            <button
              onClick={addTag}
              disabled={!tagInput.trim()}
              className="rounded-lg border border-border/40 px-2 py-1.5 text-[11px] hover:bg-[hsl(var(--landing-bg-tertiary))] transition-colors disabled:opacity-40"
              style={{ color: "hsl(var(--landing-text))" }}
            >
              +
            </button>
          </div>
        </div>
      )}

      {/* Save button */}
      {userId && hasChanges && (
        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full flex items-center justify-center gap-1.5 rounded-lg py-2 text-[11px] font-medium transition-all"
          style={{
            backgroundColor: saved ? "hsl(var(--pnl-positive))" : "hsl(var(--landing-text))",
            color: "hsl(var(--landing-bg))",
            opacity: saving ? 0.6 : 1,
          }}
        >
          {saved ? <Check className="h-3 w-3" /> : <Save className="h-3 w-3" />}
          {saving ? "Salvando..." : saved ? "Salvo!" : "Salvar observacao"}
        </button>
      )}

      {/* Consolidated / Per-account toggle */}
      {showConsolidatedToggle && dayData?.byAccount && (
        <div>
          <div
            className="flex rounded-lg overflow-hidden mb-3"
            style={{
              backgroundColor: "hsl(var(--landing-bg-tertiary))",
            }}
          >
            {(
              [
                { key: "consolidated", label: "Consolidado" },
                { key: "per-account", label: "Por conta" },
              ] as const
            ).map((tab) => (
              <button
                key={tab.key}
                onClick={() => setViewMode(tab.key)}
                className="flex-1 py-1.5 text-center text-[10px] font-medium transition-colors"
                style={{
                  backgroundColor:
                    viewMode === tab.key
                      ? "hsl(var(--landing-text))"
                      : "transparent",
                  color:
                    viewMode === tab.key
                      ? "hsl(var(--landing-bg))"
                      : "hsl(var(--landing-text-muted))",
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {viewMode === "per-account" && (
            <div className="flex flex-col gap-2">
              {Object.entries(dayData.byAccount).map(([accId, acc]) => (
                <div
                  key={accId}
                  className="flex items-center justify-between rounded-lg p-2.5"
                  style={{
                    backgroundColor: "hsl(var(--landing-bg-tertiary))",
                  }}
                >
                  <div>
                    <p
                      className="text-[11px] font-medium"
                      style={{ color: "hsl(var(--landing-text))" }}
                    >
                      {acc.accountName}
                    </p>
                    <p className="text-[9px] text-muted-foreground">
                      {acc.trades} trade{acc.trades !== 1 ? "s" : ""}
                    </p>
                  </div>
                  <span
                    className="text-xs font-semibold tabular-nums"
                    style={{ color: pnlColor(acc.pnl) }}
                  >
                    {mask(formatPnl(acc.pnl))}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tags display (read-only when no userId) */}
      {!userId && dayNote?.tags && dayNote.tags.length > 0 && (
        <div>
          <p className="text-[9px] uppercase tracking-wider mb-1.5 text-muted-foreground">
            Tags
          </p>
          <div className="flex flex-wrap gap-1">
            {dayNote.tags.map((tag) => (
              <span
                key={tag}
                className="rounded-full px-2 py-0.5 text-[10px] font-medium"
                style={{ backgroundColor: "hsl(var(--landing-bg-tertiary))", color: "hsl(var(--landing-text))" }}
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
