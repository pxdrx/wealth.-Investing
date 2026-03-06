"use client";

import { useMemo } from "react";
import { ChevronDown } from "lucide-react";
import { useActiveAccount } from "@/components/context/ActiveAccountContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

function normalizeFirmName(name?: string | null) {
  const raw = (name ?? "").toLowerCase().trim();
  if (raw.includes("the5")) return "the5ers";
  if (raw.includes("ftmo")) return "ftmo";
  return raw;
}

function formatAccountLabel(account: any) {
  const firm = account?.prop?.firm_name ?? account?.name ?? "Conta";
  const balance = Number(account?.prop?.starting_balance_usd ?? 0);
  const phase =
    account?.prop?.phase === "phase_1"
      ? "Phase 1"
      : account?.prop?.phase === "phase_2"
      ? "Phase 2"
      : account?.prop?.phase ?? "";

  const balanceLabel =
    balance > 0
      ? `$${balance.toLocaleString("en-US", { maximumFractionDigits: 0 })}`
      : "";

  return [firm, balanceLabel, phase].filter(Boolean).join(" — ");
}

export function AccountSelectorInline() {
  const { accounts, activeAccountId, setActiveAccountId } = useActiveAccount();

  const options = useMemo(() => {
    const filtered = accounts.filter((account: any) => {
      const firm = normalizeFirmName(account?.prop?.firm_name);
      return (
        account?.is_active === true &&
        account?.kind === "prop" &&
        account?.prop &&
        account?.prop?.phase === "phase_1" &&
        (firm === "the5ers" || firm === "ftmo")
      );
    });

    const unique = new Map<string, any>();

    for (const account of filtered) {
      const firm = normalizeFirmName(account?.prop?.firm_name);
      const balance = Number(account?.prop?.starting_balance_usd ?? 0);
      const phase = account?.prop?.phase ?? "";
      const key = `${firm}|${balance}|${phase}`;

      if (!unique.has(key)) {
        unique.set(key, account);
      }
    }

    return Array.from(unique.values());
  }, [accounts]);

  const active =
    options.find((account: any) => account.id === activeAccountId) ?? options[0];

  if (!active) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="inline-flex h-11 items-center gap-2 rounded-full border border-border/80 bg-card px-4 text-sm font-medium shadow-sm transition-all duration-200 hover:border-border hover:shadow-md">
        <span className="truncate max-w-[240px]">{formatAccountLabel(active)}</span>
        <ChevronDown className="h-4 w-4 opacity-60" />

      <DropdownMenuContent align="end" className="w-[320px]">
        {options.map((account: any) => (
          <DropdownMenuItem
            key={account.id}
            onClick={() => setActiveAccountId(account.id)}
            className="cursor-pointer"
          >
            {formatAccountLabel(account)}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}