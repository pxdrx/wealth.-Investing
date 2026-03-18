"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase/client";
import {
  Wallet,
  ArrowDownLeft,
  ArrowUpRight,
  AlertCircle,
  Banknote,
  PlusCircle,
  ArrowRightLeft,
} from "lucide-react";

interface WalletTransaction {
  id: string;
  user_id: string;
  account_id: string | null;
  tx_type: string;
  amount_usd: number;
  notes: string | null;
  created_at: string;
}

interface Account {
  id: string;
  name: string;
}

const formatCurrency = (amount: number): string =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);

const formatDate = (dateStr: string): string => {
  const date = new Date(dateStr);
  return date.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const txTypeLabel: Record<string, string> = {
  payout: "Payout",
  withdrawal: "Saque",
  deposit: "Depósito",
  transfer: "Transferência",
};

function getTxIcon(txType: string, amount: number) {
  if (txType === "deposit" || amount > 0) {
    return <ArrowDownLeft className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />;
  }
  return <ArrowUpRight className="h-4 w-4 text-red-500 dark:text-red-400" />;
}

function SkeletonCard({ className = "" }: { className?: string }) {
  return (
    <Card
      className={`rounded-[22px] ${className}`}
      style={{ backgroundColor: "hsl(var(--card))" }}
    >
      <CardContent className="p-6">
        <div className="animate-pulse space-y-3">
          <div className="h-4 w-24 rounded bg-muted" />
          <div className="h-8 w-40 rounded bg-muted" />
        </div>
      </CardContent>
    </Card>
  );
}

function SkeletonRow() {
  return (
    <div className="flex items-center justify-between py-4 animate-pulse">
      <div className="flex items-center gap-3">
        <div className="h-9 w-9 rounded-full bg-muted" />
        <div className="space-y-2">
          <div className="h-4 w-28 rounded bg-muted" />
          <div className="h-3 w-20 rounded bg-muted" />
        </div>
      </div>
      <div className="h-5 w-24 rounded bg-muted" />
    </div>
  );
}

export default function WalletPage() {
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [accountMap, setAccountMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      setError(null);

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.user?.id) {
        setError("Sessão não encontrada. Faça login novamente.");
        setLoading(false);
        return;
      }

      const userId = session.user.id;

      const [txResult, accResult] = await Promise.all([
        supabase
          .from("wallet_transactions")
          .select("*")
          .eq("user_id", userId)
          .order("created_at", { ascending: false }),
        supabase
          .from("accounts")
          .select("id, name")
          .eq("user_id", userId),
      ]);

      if (txResult.error) {
        setError("Erro ao carregar transações: " + txResult.error.message);
        setLoading(false);
        return;
      }

      if (accResult.error) {
        setError("Erro ao carregar contas: " + accResult.error.message);
        setLoading(false);
        return;
      }

      const map: Record<string, string> = {};
      for (const acc of (accResult.data as Account[]) ?? []) {
        map[acc.id] = acc.name;
      }

      setAccountMap(map);
      setTransactions((txResult.data as WalletTransaction[]) ?? []);
      setLoading(false);
    }

    fetchData();
  }, []);

  const totalBalance = transactions.reduce(
    (sum, tx) => sum + tx.amount_usd,
    0
  );

  // ---------- Loading State ----------
  if (loading) {
    return (
      <div className="mx-auto max-w-7xl px-6 py-12">
        <div className="mb-10">
          <div className="h-7 w-32 animate-pulse rounded bg-muted" />
          <div className="mt-2 h-4 w-56 animate-pulse rounded bg-muted" />
        </div>
        <SkeletonCard className="mb-8" />
        <Card
          className="rounded-[22px]"
          style={{ backgroundColor: "hsl(var(--card))" }}
        >
          <CardContent className="divide-y divide-border p-6">
            {Array.from({ length: 5 }).map((_, i) => (
              <SkeletonRow key={i} />
            ))}
          </CardContent>
        </Card>
      </div>
    );
  }

  // ---------- Error State ----------
  if (error) {
    return (
      <div className="mx-auto max-w-7xl px-6 py-12">
        <div className="mb-10">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Carteira
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Consolidado de todas as contas
          </p>
        </div>
        <Card
          className="rounded-[22px]"
          style={{ backgroundColor: "hsl(var(--card))" }}
        >
          <CardContent className="flex items-center gap-3 p-6">
            <AlertCircle className="h-5 w-5 text-red-500" />
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ---------- Main Render ----------
  return (
    <div className="mx-auto max-w-7xl px-6 py-12">
      {/* Header */}
      <div className="mb-10">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Carteira
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Consolidado de todas as contas
        </p>
      </div>

      {/* Total Balance Card */}
      <Card
        className="mb-8 rounded-[22px]"
        style={{ backgroundColor: "hsl(var(--card))" }}
      >
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base font-medium text-muted-foreground">
            <Wallet className="h-4 w-4" />
            Saldo Total
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p
            className={`text-3xl font-semibold tracking-tight ${
              totalBalance >= 0
                ? "text-emerald-700 dark:text-emerald-400"
                : "text-red-600 dark:text-red-400"
            }`}
          >
            {formatCurrency(totalBalance)}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {transactions.length}{" "}
            {transactions.length === 1 ? "transação" : "transações"} registradas
          </p>
        </CardContent>
      </Card>

      {/* Transactions List */}
      {transactions.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        >
          <Card
            className="rounded-[22px]"
            style={{ backgroundColor: "hsl(var(--card))" }}
          >
            <CardContent className="flex flex-col items-center justify-center py-20 px-6 text-center">
              <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-muted/40">
                <ArrowRightLeft className="h-10 w-10 text-muted-foreground/50" />
              </div>
              <h2 className="text-lg font-semibold tracking-tight text-foreground">
                Sua carteira está vazia
              </h2>
              <p className="mt-2 max-w-sm text-sm text-muted-foreground leading-relaxed">
                A carteira consolida payouts, saques, depósitos e transferências de todas as suas contas. Registre sua primeira transação para começar.
              </p>
              <Button
                className="mt-6 rounded-full gap-2"
                onClick={() => {
                  /* TODO: open add transaction flow */
                }}
              >
                <PlusCircle className="h-4 w-4" />
                Registrar primeira transação
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      ) : (
        <Card
          className="rounded-[22px]"
          style={{ backgroundColor: "hsl(var(--card))" }}
        >
          <CardHeader>
            <CardTitle className="text-base font-medium">
              Transações
            </CardTitle>
          </CardHeader>
          <CardContent className="divide-y divide-border">
            {transactions.map((tx) => (
              <div
                key={tx.id}
                className="flex items-center justify-between py-4 first:pt-0 last:pb-0"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-muted/60">
                    {getTxIcon(tx.tx_type, tx.amount_usd)}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {txTypeLabel[tx.tx_type] ?? tx.tx_type}
                      {tx.account_id && accountMap[tx.account_id]
                        ? ` — ${accountMap[tx.account_id]}`
                        : ""}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(tx.created_at)}
                      {tx.notes ? ` · ${tx.notes}` : ""}
                    </p>
                  </div>
                </div>
                <p
                  className={`text-sm font-medium tabular-nums ${
                    tx.amount_usd >= 0
                      ? "text-emerald-700 dark:text-emerald-400"
                      : "text-red-600 dark:text-red-400"
                  }`}
                >
                  {tx.amount_usd >= 0 ? "+" : ""}
                  {formatCurrency(tx.amount_usd)}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
