"use client";

import { FileCheck } from "lucide-react";

interface PreviewTrade {
  symbol: string;
  direction: "buy" | "sell";
  lots: number;
  pnl: number;
  date: string;
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
}

export function ImportPreview({
  fileName, totalTrades, payouts, trades, compact = false, onConfirm, onCancel, loading = false,
}: ImportPreviewProps) {
  const displayCount = compact ? 3 : 5;
  const displayed = trades.slice(0, displayCount);

  return (
    <div className="rounded-[22px] border p-4" style={{ backgroundColor: "hsl(var(--card))" }}>
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="text-sm font-semibold">{fileName}</p>
          <p className="text-xs text-muted-foreground">
            {totalTrades} trades encontrados{payouts > 0 ? ` · ${payouts} payouts` : ""}
          </p>
        </div>
        <span className="text-[11px] px-2 py-0.5 rounded-md bg-[hsl(var(--pnl-positive)/0.15)] text-[hsl(var(--pnl-positive))]">
          <FileCheck size={12} className="inline mr-1" />Parseado OK
        </span>
      </div>

      <div className="rounded-lg overflow-hidden border">
        <div className="grid grid-cols-[1fr_60px_50px_70px_70px] px-3 py-1.5 bg-muted/50 text-[11px] text-muted-foreground uppercase tracking-wider">
          <span>Símbolo</span><span>Dir.</span><span>Lotes</span><span className="text-right">P&L</span><span className="text-right">Data</span>
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
          Mostrando {displayCount} de {totalTrades} trades
        </p>
      )}

      <div className="flex gap-3 justify-end mt-4">
        <button onClick={onCancel} className="text-sm px-4 py-1.5 rounded-lg border text-muted-foreground hover:bg-muted transition-colors">
          Cancelar
        </button>
        <button
          onClick={onConfirm}
          disabled={loading}
          className="text-sm px-4 py-1.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
        >
          {loading ? "Importando..." : `Importar ${totalTrades} trades`}
        </button>
      </div>
    </div>
  );
}
