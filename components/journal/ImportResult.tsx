"use client";

import { useState } from "react";
import { CheckCircle, Brain } from "lucide-react";
import { DiscrepancyModal } from "./DiscrepancyModal";
import Link from "next/link";

interface ImportResultProps {
  fileName: string;
  imported: number;
  duplicates: number;
  failed: number;
  importedAt: string;
  duration: string;
  duplicateDetails?: Array<{ symbol: string; direction: string; date: string }>;
  skippedDetails?: Array<{ line: number; reason: string; data?: string }>;
  showAiCoach?: boolean;
  onReset: () => void;
}

export function ImportResult({
  fileName, imported, duplicates, failed,
  importedAt, duration, duplicateDetails, skippedDetails,
  showAiCoach = false, onReset,
}: ImportResultProps) {
  const [modalOpen, setModalOpen] = useState(false);

  const kpis = [
    { value: imported, label: "importados", color: "hsl(var(--pnl-positive))", bg: "hsl(var(--pnl-positive)/0.1)" },
    { value: duplicates, label: "duplicatas", color: "hsl(210 40% 70%)", bg: "hsl(210 40% 70% / 0.1)" },
    { value: failed, label: "falhou", color: "hsl(var(--pnl-negative))", bg: "hsl(var(--pnl-negative)/0.1)" },
  ];

  return (
    <div className="rounded-2xl border p-6 text-center" style={{ backgroundColor: "hsl(var(--card))" }}>
      <CheckCircle className="mx-auto mb-2 text-[hsl(var(--pnl-positive))]" size={36} />
      <p className="text-base font-semibold mb-4">Import concluído</p>

      <div className="grid grid-cols-3 gap-3 mb-4">
        {kpis.map((k) => (
          <div key={k.label} className="rounded-lg p-3" style={{ backgroundColor: k.bg }}>
            <p className="text-xl font-bold tabular-nums" style={{ color: k.color }}>{k.value}</p>
            <p className="text-[11px] text-muted-foreground">{k.label}</p>
          </div>
        ))}
      </div>

      <div className="flex gap-3 justify-center">
        {(duplicates > 0 || failed > 0) && (
          <button
            onClick={() => setModalOpen(true)}
            className="text-xs px-3 py-1.5 rounded-lg border border-[hsl(var(--pnl-negative)/0.3)] text-[hsl(var(--pnl-negative))] bg-[hsl(var(--pnl-negative)/0.1)] hover:bg-[hsl(var(--pnl-negative)/0.15)] transition-colors"
          >
            Ver detalhes ({duplicates + failed})
          </button>
        )}
        {showAiCoach && (
          <Link
            href="/app/ai-coach"
            className="text-xs px-3 py-1.5 rounded-lg border border-primary/30 text-primary bg-primary/10 hover:bg-primary/20 transition-colors"
          >
            <Brain size={12} className="inline mr-1" />Analisar com AI Coach
          </Link>
        )}
        <button
          onClick={onReset}
          className="text-xs px-3 py-1.5 rounded-lg border text-muted-foreground hover:bg-muted transition-colors"
        >
          Novo import
        </button>
      </div>

      <DiscrepancyModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        fileName={fileName}
        importedAt={importedAt}
        duration={duration}
        imported={imported}
        duplicates={duplicates}
        duplicateDetails={duplicateDetails}
        failed={failed}
        skippedDetails={skippedDetails}
      />
    </div>
  );
}
