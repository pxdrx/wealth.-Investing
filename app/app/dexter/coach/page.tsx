import { PaywallGate } from "@/components/billing/PaywallGate";

export default function DexterCoachPage() {
  return (
    <PaywallGate requiredPlan="pro" blurContent>
      <div className="rounded-xl border border-border/60 bg-card p-8 text-center">
        <h2 className="text-lg font-semibold tracking-tight text-foreground">Coach</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Sessões reflexivas sobre seus trades. Implementação em C-08.
        </p>
      </div>
    </PaywallGate>
  );
}
