import { PaywallGate } from "@/components/billing/PaywallGate";

export default function DexterAnalystPage() {
  return (
    <PaywallGate requiredPlan="ultra" blurContent>
      <div className="rounded-xl border border-border/60 bg-card p-8 text-center">
        <h2 className="text-lg font-semibold tracking-tight text-foreground">Analyst</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Análise quantitativa profunda de ativos. Implementação em C-09.
        </p>
      </div>
    </PaywallGate>
  );
}
