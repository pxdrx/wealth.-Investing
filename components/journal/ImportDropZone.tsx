// components/journal/ImportDropZone.tsx
"use client";

import { useState, useRef, useCallback } from "react";
import { FileSpreadsheet } from "lucide-react";
import { motion } from "framer-motion";

interface ImportDropZoneProps {
  onFileSelected: (file: File) => void;
  compact?: boolean;
  disabled?: boolean;
}

export function ImportDropZone({ onFileSelected, compact = false, disabled = false }: ImportDropZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const ACCEPTED = ".xlsx,.html,.htm,.csv,.pdf,application/pdf";
  const FORMATS = [
    { label: "MT5 XLSX", enabled: true },
    { label: "MT5 HTML", enabled: true },
    { label: "cTrader CSV", enabled: true },
    { label: "Position History PDF", enabled: true },
  ];

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDragIn = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.items?.length > 0) setIsDragging(true);
  }, []);

  const handleDragOut = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) onFileSelected(file);
  }, [onFileSelected]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onFileSelected(file);
    if (inputRef.current) inputRef.current.value = "";
  }, [onFileSelected]);

  const py = compact ? "py-8" : "py-12";

  return (
    <div>
      <motion.div
        onDragEnter={handleDragIn}
        onDragLeave={handleDragOut}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        animate={{ borderColor: isDragging ? "hsl(var(--pnl-positive))" : "hsl(var(--border))" }}
        className={`border-2 border-dashed rounded-[22px] ${py} px-6 text-center transition-colors cursor-pointer ${
          isDragging ? "bg-[hsl(var(--pnl-positive)/0.05)]" : "bg-transparent"
        } ${disabled ? "opacity-50 pointer-events-none" : ""}`}
        onClick={() => inputRef.current?.click()}
      >
        <FileSpreadsheet className="mx-auto mb-3 text-muted-foreground" size={compact ? 32 : 40} />
        <p className="text-sm text-muted-foreground mb-1">
          Arraste seu relatório aqui
        </p>
        <p className="text-xs text-muted-foreground/60 mb-3">
          Formatos aceitos: .xlsx, .html, .htm, .csv
        </p>
        <button
          type="button"
          className="text-xs px-4 py-1.5 rounded-lg border border-primary/30 text-primary bg-primary/10 hover:bg-primary/20 transition-colors"
          onClick={(e) => { e.stopPropagation(); inputRef.current?.click(); }}
        >
          Ou selecione um arquivo
        </button>
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED}
          className="hidden"
          onChange={handleFileInput}
        />
      </motion.div>
      {!compact && (
        <div className="flex gap-2 mt-3 justify-center">
          {FORMATS.map((f) => (
            <span
              key={f.label}
              className={`text-[11px] px-3 py-1 rounded-full ${
                f.enabled
                  ? "bg-primary/10 text-primary"
                  : "bg-muted text-muted-foreground/50"
              }`}
            >
              {f.label}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
