"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertTriangle, CheckCircle2, ChevronDown, ChevronRight, XCircle } from "lucide-react";

interface SkippedDetail {
  line: number;
  reason: string;
  code?: string;
  hint?: string;
  details?: string;
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

function SkippedRow({ s }: { s: SkippedDetail }) {
  const [open, setOpen] = useState(false);
  const hasDetail = !!(s.code || s.hint || s.details || s.data);
  return (
    <div className="rounded-md border border-[hsl(var(--pnl-negative)/0.2)]">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-start justify-between gap-3 px-3 py-2 text-left text-xs"
      >
        <div className="flex items-start gap-2 min-w-0">
          {hasDetail ? (
            open ? (
              <ChevronDown className="mt-0.5 h-3 w-3 flex-shrink-0 text-muted-foreground" />
            ) : (
              <ChevronRight className="mt-0.5 h-3 w-3 flex-shrink-0 text-muted-foreground" />
            )
          ) : (
            <span className="w-3" />
          )}
          <div className="min-w-0">
            <p className="font-medium text-foreground">
              Linha {s.line}
              {s.data ? (
                <span className="ml-1.5 truncate text-muted-foreground">· {s.data}</span>
              ) : null}
            </p>
            <p className="text-[hsl(var(--pnl-negative))]">{s.reason}</p>
          </div>
        </div>
        {s.code && (
          <span className="flex-shrink-0 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
            {s.code}
          </span>
        )}
      </button>
      {open && hasDetail && (
        <div className="space-y-1 border-t border-[hsl(var(--pnl-negative)/0.15)] bg-[hsl(var(--pnl-negative)/0.03)] px-3 py-2 text-[11px] text-muted-foreground">
          {s.code && (
            <p>
              <span className="font-medium text-foreground">code:</span>{" "}
              <span className="font-mono">{s.code}</span>
            </p>
          )}
          {s.hint && (
            <p>
              <span className="font-medium text-foreground">hint:</span> {s.hint}
            </p>
          )}
          {s.details && (
            <p className="whitespace-pre-wrap break-words">
              <span className="font-medium text-foreground">details:</span> {s.details}
            </p>
          )}
        </div>
      )}
    </div>
  );
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

          <p className="flex items-center gap-1.5 text-sm text-[hsl(var(--pnl-positive))]">
            <CheckCircle2 className="h-4 w-4" />
            {imported} trades importados
          </p>

          {duplicates > 0 && (
            <div>
              <p className="mb-2 flex items-center gap-1.5 text-sm text-yellow-500">
                <AlertTriangle className="h-4 w-4" />
                {duplicates} duplicatas ignoradas
              </p>
              <div className="space-y-1 rounded-lg bg-yellow-500/5 p-3">
                {duplicateDetails.map((d, i) => (
                  <div key={i} className="flex justify-between text-xs text-muted-foreground">
                    <span>
                      {d.symbol} {d.direction} · {d.date}
                    </span>
                    <span className="text-yellow-500">Já existe</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {failed > 0 && (
            <div>
              <p className="mb-2 flex items-center gap-1.5 text-sm text-[hsl(var(--pnl-negative))]">
                <XCircle className="h-4 w-4" />
                {failed} linhas com erro
              </p>
              <div className="max-h-72 space-y-1.5 overflow-y-auto rounded-lg bg-[hsl(var(--pnl-negative)/0.05)] p-2">
                {skippedDetails.map((s, i) => (
                  <SkippedRow key={i} s={s} />
                ))}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
