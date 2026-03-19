"use client";

import { useState } from "react";
import confetti from "canvas-confetti";
import NumberFlow from "@number-flow/react";
import { Check } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useSubscription } from "@/components/context/SubscriptionContext";
import { supabase } from "@/lib/supabase/client";
import type { Plan } from "@/lib/subscription";

interface TierDef {
  id: Plan;
  name: string;
  monthlyPrice: number;
  annualPrice: number;
  features: string[];
  highlighted?: boolean;
  badge?: string;
}

const tiers: TierDef[] = [
  {
    id: "free",
    name: "Free",
    monthlyPrice: 0,
    annualPrice: 0,
    features: [
      "30 trades/mês",
      "2 contas",
      "Dashboard básico",
      "Import MT5",
      "1 consulta AI/mês",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    monthlyPrice: 79.9,
    annualPrice: 63.9,
    highlighted: true,
    badge: "Mais popular",
    features: [
      "Trades ilimitados",
      "5 contas",
      "Dashboard completo",
      "Export CSV",
      "cTrader",
      "10 consultas AI/mês",
    ],
  },
  {
    id: "ultra",
    name: "Ultra",
    monthlyPrice: 139.9,
    annualPrice: 111.9,
    features: [
      "Tudo do Pro",
      "Contas ilimitadas",
      "Comparação de contas",
      "Alertas customizados",
      "5 consultas AI/dia",
      "Suporte prioritário",
    ],
  },
];

function fireConfetti() {
  const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 9999 };
  confetti({ ...defaults, particleCount: 50, origin: { x: 0.3, y: 0.6 } });
  confetti({ ...defaults, particleCount: 50, origin: { x: 0.7, y: 0.6 } });
}

export function PricingCards() {
  const [annual, setAnnual] = useState(false);
  const [loadingTier, setLoadingTier] = useState<Plan | null>(null);
  const { plan: currentPlan } = useSubscription();

  function handleToggle() {
    const goingAnnual = !annual;
    setAnnual(goingAnnual);
    if (goingAnnual) fireConfetti();
  }

  async function handleSubscribe(tier: Plan) {
    setLoadingTier(tier);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) {
        window.location.href = "/login";
        return;
      }
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ plan: tier, interval: annual ? "year" : "month" }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch {
      // ignore
    } finally {
      setLoadingTier(null);
    }
  }

  async function handleManageSubscription() {
    setLoadingTier("free");
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) {
        window.location.href = "/login";
        return;
      }
      const res = await fetch("/api/billing/portal", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch {
      // ignore
    } finally {
      setLoadingTier(null);
    }
  }

  return (
    <div className="space-y-8">
      {/* Toggle */}
      <div className="flex items-center justify-center gap-3">
        <span className={cn("text-sm font-medium", !annual ? "text-foreground" : "text-muted-foreground")}>
          Mensal
        </span>
        <button
          type="button"
          role="switch"
          aria-checked={annual}
          onClick={handleToggle}
          className={cn(
            "relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors",
            annual ? "bg-blue-600" : "bg-muted"
          )}
        >
          <span
            className={cn(
              "pointer-events-none inline-block h-[22px] w-[22px] rounded-full bg-white shadow-sm ring-0 transition-transform",
              annual ? "translate-x-[22px]" : "translate-x-[2px]"
            )}
            style={{ marginTop: "1px" }}
          />
        </button>
        <span className={cn("text-sm font-medium", annual ? "text-foreground" : "text-muted-foreground")}>
          Anual
        </span>
        {annual && (
          <span className="rounded-full bg-green-500/10 px-2.5 py-0.5 text-xs font-semibold text-green-600 dark:text-green-400">
            -20%
          </span>
        )}
      </div>

      {/* Cards */}
      <div className="grid gap-6 md:grid-cols-3">
        {tiers.map((tier) => {
          const isCurrent = currentPlan === tier.id;
          const price = annual ? tier.annualPrice : tier.monthlyPrice;
          const isFree = tier.id === "free";

          return (
            <Card
              key={tier.id}
              className={cn(
                "relative flex flex-col rounded-[22px] p-6",
                tier.highlighted && "border-blue-500 border-2 shadow-lg"
              )}
              style={{ backgroundColor: "hsl(var(--card))" }}
            >
              {tier.badge && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-blue-600 px-3 py-1 text-xs font-semibold text-white">
                  {tier.badge}
                </span>
              )}

              <h3 className="text-lg font-semibold tracking-tight">{tier.name}</h3>

              <div className="mt-4 flex items-baseline gap-1">
                {isFree ? (
                  <span className="text-3xl font-bold tracking-tight">Grátis</span>
                ) : (
                  <>
                    <span className="text-sm font-medium text-muted-foreground">R$</span>
                    <NumberFlow
                      value={price}
                      format={{ minimumFractionDigits: 2, maximumFractionDigits: 2 }}
                      locales="pt-BR"
                      className="text-3xl font-bold tracking-tight"
                    />
                    <span className="text-sm text-muted-foreground">/mês</span>
                  </>
                )}
              </div>

              {!isFree && annual && (
                <p className="mt-1 text-xs text-muted-foreground">
                  Cobrado anualmente
                </p>
              )}

              <ul className="mt-6 flex-1 space-y-2.5">
                {tier.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-muted-foreground">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-green-500" />
                    {f}
                  </li>
                ))}
              </ul>

              <div className="mt-6">
                {isCurrent ? (
                  <Button
                    className="w-full rounded-full"
                    variant="outline"
                    disabled
                  >
                    Plano atual
                  </Button>
                ) : isFree ? (
                  currentPlan === "free" ? (
                    <Button
                      className="w-full rounded-full"
                      variant="outline"
                      disabled
                    >
                      Plano atual
                    </Button>
                  ) : (
                    <Button
                      className="w-full rounded-full"
                      variant="outline"
                      disabled={loadingTier === "free"}
                      onClick={handleManageSubscription}
                    >
                      {loadingTier === "free" ? "Redirecionando..." : "Gerenciar assinatura"}
                    </Button>
                  )
                ) : (
                  <Button
                    className={cn(
                      "w-full rounded-full",
                      tier.highlighted
                        ? "bg-blue-600 text-white hover:bg-blue-700"
                        : ""
                    )}
                    variant={tier.highlighted ? "default" : "outline"}
                    disabled={loadingTier === tier.id}
                    onClick={() => handleSubscribe(tier.id)}
                  >
                    {loadingTier === tier.id
                      ? "Redirecionando..."
                      : currentPlan === tier.id
                        ? "Trocar período"
                        : "Assinar"}
                  </Button>
                )}
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
