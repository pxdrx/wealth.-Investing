"use client";

import { Fragment, useState } from "react";
import { FileCheck, ChevronDown, ChevronRight, Info } from "lucide-react";
import { useAppT } from "@/hooks/useAppLocale";

interface PreviewTrade {
  symbol: string;
  direction: "buy" | "sell";
  lots: number;
  pnl: number;
  date: string;
}

interface MappingEntry {
  header: string;
  confidence: string;
}

interface ImportPreviewProps {
  fileName: string;
  totalTrades: number;
  payouts: number;
  trades: PreviewTrade[];
  compact?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
  parserUsed?: string;
  mapping?: Record<string, MappingEntry> | null;
  warnings?: string[];
  skippedOpenPositions?: number;
}

export function ImportPreview({
  fileName, totalTrades, payouts, trades, compact = false, onConfirm, onCancel, loading = false,
  parserUsed, mapping, warnings, skippedOpenPositions = 0,
}: ImportPreviewProps) {
  const t = useAppT();
  const [showMapping, setShowMapping] = useState(false);
  const isAdaptive = !!parserUsed && parserUsed.startsWith("csv_adaptive");
  const mappingEntries = mapping ? Object.entries(mapping) : [];
  const displayCount = compact ? 3 : 5;
  const displayed = trades.slice(0, displayCount);

  return (
    <div className="rounded-[22px] border p-4" style={{ backgroundColor: "hsl(var(--card))" }}>
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="text-sm font-semibold">{fileName}</p>
          <p className="text-xs text-muted-foreground">
            {totalTrades} {t("importPreview.tradesFound")}{payouts > 0 ? ` · ${payouts} payouts` : ""}
          </p>
        </div>
        <span className="text-[11px] px-2 py-0.5 rounded-md bg-[hsl(var(--pnl-positive)/0.15)] text-[hsl(var(--pnl-positive))]">
          <FileCheck size={12} className="inline mr-1" />{t("importPreview.parsedOk")}
        </span>
      </div>

      <div className="rounded-lg overflow-hidden border">
        <div className="grid grid-cols-[1fr_60px_50px_70px_70px] px-3 py-1.5 bg-muted/50 text-[11px] text-muted-foreground uppercase tracking-wider">
          <span>{t("importPreview.colSymbol")}</span><span>{t("importPreview.colDir")}</span><span>{t("importPreview.colLots")}</span><span className="text-right">P&L</span><span className="text-right">{t("importPreview.colDate")}</span>
        </div>
        {displayed.map((t, i) => (
          <div key={i} className="grid grid-cols-[1fr_60px_50px_70px_70px] px-3 py-1.5 text-xs border-t">
            <span>{t.symbol}</span>
            <span className={t.direction === "buy" ? "text-[hsl(var(--pnl-positive))]" : "text-[hsl(var(--pnl-negative))]"}>
              {t.direction === "buy" ? "Buy" : "Sell"}
            </span>
            <span>{t.lots}</span>
            <span className={`text-right tabular-nums ${t.pnl >= 0 ? "text-[hsl(var(--pnl-positive))]" : "text-[hsl(var(--pnl-negative))]"}`}>
              {t.pnl >= 0 ? "+" : ""}${Math.abs(t.pnl).toLocaleString("en", { maximumFractionDigits: 0 })}
            </span>
            <span className="text-right text-muted-foreground">{t.date}</span>
          </div>
        ))}
      </div>
      {totalTrades > displayCount && (
        <p className="text-[11px] text-muted-foreground text-center mt-1.5">
          {t("importPreview.showingOf").replace("{shown}", String(displayCount)).replace("{total}", String(totalTrades))}
        </p>
      )}

      {isAdaptive && (mappingEntries.length > 0 || (warnings && warnings.length > 0) || skippedOpenPositions > 0) && (
        <div className="mt-3 rounded-lg border border-border/60 bg-muted/30 p-2.5 text-[11px]">
          <button
            onClick={() => setShowMapping((s) => !s)}
            className="flex items-center gap-1.5 w-full text-left text-muted-foreground hover:text-foreground transition-colors"
          >
            {showMapping ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
            <Info size={12} />
            <span>{t("importPreview.autoMapping")}</span>
            {skippedOpenPositions > 0 && (
              <span className="ml-auto px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-600 dark:text-amber-400">
                {skippedOpenPositions} {skippedOpenPositions > 1 ? t("importPreview.openPositionsIgnoredPlural") : t("importPreview.openPositionsIgnored")}
              </span>
            )}
          </button>
          {showMapping && (
            <div className="mt-2 space-y-1.5">
              {mappingEntries.length > 0 && (
                <div className="grid grid-cols-[auto_1fr_auto] gap-x-2 gap-y-0.5">
                  {mappingEntries.map(([field, entry]) => (
                    <Fragment key={field}>
                      <span className="font-mono text-muted-foreground">{field}</span>
                      <span className="truncate">{entry.header}</span>
                      <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{entry.confidence}</span>
                    </Fragment>
                  ))}
                </div>
              )}
              {warnings && warnings.length > 0 && (
                <ul className="mt-2 pt-2 border-t border-border/40 list-disc list-inside text-muted-foreground space-y-0.5">
                  {warnings.map((w, i) => (
                    <li key={i}>{w}</li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      )}

      <div className="flex gap-3 justify-end mt-4">
        <button onClick={onCancel} className="text-sm px-4 py-1.5 rounded-lg border text-muted-foreground hover:bg-muted transition-colors">
          {t("common.cancel")}
        </button>
        <button
          onClick={onConfirm}
          disabled={loading}
          className="text-sm px-4 py-1.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
        >
          {loading ? t("importPreview.importing") : `${t("importPreview.importCta")} ${totalTrades} trades`}
        </button>
      </div>
    </div>
  );
}
