"use client";

import { MoneyDisplay } from "@/components/ui/MoneyDisplay";

type MetricFormat = "currency" | "percent" | "number" | "ratio" | "duration";

interface MetricCardProps {
  label: string;
  value: number | null;
  format?: MetricFormat;
  description?: string;
  colorize?: boolean;
}

function formatValue(value: number | null, format: MetricFormat): string {
  if (value === null) return "N/A";
  switch (format) {
    case "percent":
      return `${value.toFixed(1)}%`;
    case "ratio":
      return value === Infinity ? "Inf" : value.toFixed(2);
    case "duration": {
      const h = Math.floor(value / 60);
      const m = Math.round(value % 60);
      return h > 0 ? `${h}h ${m}m` : `${m}m`;
    }
    case "number":
      return value.toFixed(1);
    default:
      return value.toFixed(2);
  }
}

export function MetricCard({ label, value, format = "number", description, colorize = false }: MetricCardProps) {
  const isCurrency = format === "currency";
  const colorClass = colorize && value !== null
    ? value > 0
      ? "text-emerald-500"
      : value < 0
        ? "text-red-500"
        : ""
    : "";

  return (
    <div
      className="rounded-[22px] p-5 shadow-soft dark:shadow-soft-dark isolate"
      style={{ backgroundColor: "hsl(var(--card))" }}
    >
      <p className="text-xs text-muted-foreground font-medium mb-1">{label}</p>
      <div className={`text-xl font-semibold tracking-tight ${colorClass}`}>
        {isCurrency && value !== null ? (
          <MoneyDisplay value={value} colorize={colorize} />
        ) : (
          formatValue(value, format)
        )}
      </div>
      {description && (
        <p className="text-[11px] text-muted-foreground mt-1">{description}</p>
      )}
    </div>
  );
}
