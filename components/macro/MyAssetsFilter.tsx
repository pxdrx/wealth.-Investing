// [C-10] Toggle that narrows macro feeds to currencies of the user's traded
// symbols. Persists selection in localStorage.
"use client";

import { useEffect, useState, useCallback } from "react";
import { Filter } from "lucide-react";

const STORAGE_KEY = "macro.filter.myAssets";

export function useMyAssetsToggle(): [boolean, (next: boolean) => void] {
  const [enabled, setEnabled] = useState(false);
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === "1") setEnabled(true);
    } catch {}
  }, []);
  const set = useCallback((next: boolean) => {
    setEnabled(next);
    try { localStorage.setItem(STORAGE_KEY, next ? "1" : "0"); } catch {}
  }, []);
  return [enabled, set];
}

interface MyAssetsFilterProps {
  enabled: boolean;
  onToggle: (next: boolean) => void;
  currencies: string[];
  loading?: boolean;
  disabled?: boolean;
}

export function MyAssetsFilter({ enabled, onToggle, currencies, loading, disabled }: MyAssetsFilterProps) {
  const label = loading
    ? "Carregando ativos..."
    : currencies.length === 0
      ? "Sem trades recentes"
      : enabled
        ? `Filtrando ${currencies.length} moeda${currencies.length === 1 ? "" : "s"}`
        : "Só meus ativos";

  return (
    <button
      type="button"
      onClick={() => onToggle(!enabled)}
      disabled={disabled || loading || currencies.length === 0}
      className={[
        "inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors",
        "border disabled:opacity-50 disabled:cursor-not-allowed",
        enabled
          ? "border-foreground/30 bg-foreground text-background"
          : "border-border/60 text-muted-foreground hover:text-foreground hover:bg-muted",
      ].join(" ")}
      title={
        currencies.length > 0
          ? `Moedas: ${currencies.join(", ")}`
          : "Importe ou adicione trades para ativar"
      }
    >
      <Filter className="h-3.5 w-3.5" />
      {label}
    </button>
  );
}
