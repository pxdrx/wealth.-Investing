"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface SkippedDetail {
  line: number;
  reason: string;
  data?: string;
}

interface DuplicateDetail {
  symbol: string;
  direction: string;
  date: string;
}

interface DiscrepancyModalProps {
  open: boolean;
  onClose: () => void;
  fileName: string;
  importedAt: string;
  duration: string;
  imported: number;
  duplicates: number;
  duplicateDetails?: DuplicateDetail[];
  failed: number;
  skippedDetails?: SkippedDetail[];
}

export function DiscrepancyModal({
  open, onClose, fileName, importedAt, duration,
  imported, duplicates, duplicateDetails = [], failed, skippedDetails = [],
}: DiscrepancyModalProps) {
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Detalhes do Import</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <p className="text-sm font-medium">{fileName}</p>
            <p className="text-xs text-muted-foreground">
              Importado em {importedAt} · Duração: {duration}
            </p>
          </div>

          <p className="text-sm text-[hsl(var(--pnl-positive))]">
            ✅ {imported} trades importados com sucesso
          </p>

          {duplicates > 0 && (
            <div>
              <p className="text-sm text-yellow-500 mb-2">⚠️ {duplicates} duplicatas ignoradas</p>
              <div className="rounded-lg bg-yellow-500/5 p-3 space-y-1">
                {duplicateDetails.map((d, i) => (
                  <div key={i} className="flex justify-between text-xs text-muted-foreground">
                    <span>{d.symbol} {d.direction} · {d.date}</span>
                    <span className="text-yellow-500">Já existe</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {failed > 0 && (
            <div>
              <p className="text-sm text-[hsl(var(--pnl-negative))] mb-2">❌ {failed} linhas com erro</p>
              <div className="rounded-lg bg-[hsl(var(--pnl-negative)/0.05)] p-3 space-y-1">
                {skippedDetails.map((s, i) => (
                  <div key={i} className="flex justify-between text-xs text-muted-foreground">
                    <span>Linha {s.line}{s.data ? ` · ${s.data}` : ""}</span>
                    <span className="text-[hsl(var(--pnl-negative))]">{s.reason}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
