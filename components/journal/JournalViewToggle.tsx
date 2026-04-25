"use client";

import { LayoutGrid, Rows3 } from "lucide-react";
import { useAppT } from "@/hooks/useAppLocale";

export type JournalView = "cards" | "table";

interface Props {
  value: JournalView;
  onChange: (next: JournalView) => void;
}

export function JournalViewToggle({ value, onChange }: Props) {
  const t = useAppT();
  return (
    <div
      role="radiogroup"
      aria-label={t("journalView.aria")}
      className="inline-flex items-center rounded-full border border-border/70 p-0.5"
      style={{ backgroundColor: "hsl(var(--card))" }}
    >
      <Button
        active={value === "cards"}
        onClick={() => onChange("cards")}
        icon={<LayoutGrid className="h-3.5 w-3.5" aria-hidden />}
        label={t("journalView.cards")}
      />
      <Button
        active={value === "table"}
        onClick={() => onChange("table")}
        icon={<Rows3 className="h-3.5 w-3.5" aria-hidden />}
        label={t("journalView.table")}
      />
    </div>
  );
}

function Button({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={active}
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
        active
          ? "bg-foreground text-background"
          : "text-muted-foreground hover:text-foreground"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}
