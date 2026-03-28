"use client";

import { Upload, FileSpreadsheet, CheckCircle2 } from "lucide-react";

export function MockupImportFlow() {
  return (
    <div
      className="relative rounded-[22px] border p-5 md:p-6 overflow-hidden"
      style={{
        backgroundColor: "hsl(var(--landing-bg-elevated))",
        borderColor: "hsl(var(--landing-border))",
        boxShadow: "var(--landing-card-shadow)",
      }}
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-5">
        <div
          className="h-2.5 w-2.5 rounded-full"
          style={{ backgroundColor: "hsl(var(--landing-accent))" }}
        />
        <span className="font-mono text-xs text-l-text-muted">
          IMPORTAR OPERAÇÕES
        </span>
      </div>

      {/* Drop zone */}
      <div
        className="rounded-xl border-2 border-dashed p-6 md:p-8 text-center mb-5"
        style={{ borderColor: "hsl(var(--landing-accent) / 0.3)" }}
      >
        <div
          className="mx-auto h-12 w-12 rounded-xl flex items-center justify-center mb-3"
          style={{ backgroundColor: "hsl(var(--landing-accent) / 0.1)" }}
        >
          <Upload
            className="h-5 w-5"
            style={{ color: "hsl(var(--landing-accent))" }}
          />
        </div>
        <p className="text-sm font-medium text-l-text mb-1">
          Arraste seu relatório aqui
        </p>
        <p className="text-xs text-l-text-muted">
          XLSX, HTML ou CSV — até 50MB
        </p>
      </div>

      {/* File items */}
      <div className="space-y-2.5">
        {[
          { name: "MT5_Statement_Mar2026.xlsx", status: "done", trades: 342 },
          { name: "cTrader_History.csv", status: "done", trades: 128 },
          { name: "FTMO_Challenge.html", status: "loading", trades: null },
        ].map((file) => (
          <div
            key={file.name}
            className="flex items-center gap-3 rounded-xl border px-4 py-3"
            style={{
              backgroundColor: "hsl(var(--landing-bg-tertiary))",
              borderColor: "hsl(var(--landing-border))",
            }}
          >
            <FileSpreadsheet
              className="h-4 w-4 shrink-0"
              style={{ color: "hsl(var(--landing-accent))" }}
            />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-l-text truncate">
                {file.name}
              </p>
              {file.status === "done" && (
                <p className="text-[10px] text-l-text-muted">
                  {file.trades} operações importadas
                </p>
              )}
              {file.status === "loading" && (
                <div className="mt-1 h-1 rounded-full overflow-hidden" style={{ backgroundColor: "hsl(var(--landing-border))" }}>
                  <div
                    className="h-full rounded-full w-2/3"
                    style={{ backgroundColor: "hsl(var(--landing-accent))" }}
                  />
                </div>
              )}
            </div>
            {file.status === "done" && (
              <CheckCircle2
                className="h-4 w-4 shrink-0"
                style={{ color: "hsl(152 40% 38%)" }}
              />
            )}
          </div>
        ))}
      </div>

      {/* Floating badge */}
      <div
        className="absolute -top-2 -right-2 rounded-full border px-3 py-1 font-mono text-xs font-semibold shadow-lg"
        style={{
          backgroundColor: "hsl(var(--landing-bg-elevated))",
          borderColor: "hsl(152 40% 38% / 0.3)",
          color: "hsl(152 40% 38%)",
        }}
      >
        470 trades
      </div>
    </div>
  );
}
