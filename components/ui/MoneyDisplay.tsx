"use client";

import { usePrivacy } from "@/components/context/PrivacyContext";

interface MoneyDisplayProps {
  value: number;
  currency?: "USD" | "BRL";
  showSign?: boolean;
  className?: string;
  colorize?: boolean;
}

const formatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

export function MoneyDisplay({
  value,
  currency = "USD",
  showSign = false,
  className = "",
  colorize = false,
}: MoneyDisplayProps) {
  const { hidden } = usePrivacy();

  if (hidden) {
    const prefix = currency === "BRL" ? "R$" : "$";
    return <span className={className}>{prefix} •••••</span>;
  }

  const abs = Math.abs(value);
  const formatted = currency === "BRL"
    ? new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(abs)
    : formatter.format(abs);

  const sign = value >= 0 ? "+" : "-";
  const display = showSign
    ? `${sign}${formatted}`
    : value < 0
      ? `-${formatted}`
      : formatted;

  const colorClass = colorize
    ? value >= 0
      ? "text-emerald-500"
      : "text-red-500"
    : "";

  return <span className={`${colorClass} ${className}`.trim()}>{display}</span>;
}
