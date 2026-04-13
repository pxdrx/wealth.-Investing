"use client";

import { useState } from "react";
import confetti from "canvas-confetti";
import NumberFlow from "@number-flow/react";
import { Check, ArrowDown, ArrowUp } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { useSubscription } from "@/components/context/SubscriptionContext";
import { supabase } from "@/lib/supabase/client";
import type { Plan } from "@/lib/subscription";

interface TierDef {
  id: Plan;
  name: string;
  description?: string;
  monthlyPrice: number;
  annualPrice: number;
  features: string[];
  highlighted?: boolean;
  badge?: string;
}

const PLAN_RANK: Record<Plan, number> = { free: 0, pro: 1, ultra: 2, mentor: 3 };

const tiers: TierDef[] = [
  {
    id: "free",
    name: "Free",
    description: "Comece a registrar. Sem compromisso.",
    monthlyPrice: 0,
    annualPrice: 0,
    features: [
      "10 trades por mês",
      "1 conta",
      "3 consultas AI Coach/mês",
      "Journal básico",
      "Import MT5",
      "Calendário econômico",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    description: "Seus dados, sua análise. Você no controle total.",
    monthlyPrice: 29.9,
    annualPrice: 22.9,
    highlighted: true,
    badge: "Mais popular",
    features: [
      "Trades ilimitados",
      "5 contas simultâneas",
      "15 consultas AI Coach/mês",
      "Journal completo + Tags",
      "Inteligência Macro completa",
      "Headlines ao vivo",
      "Briefing Macroeconômico",
      "Dashboard completo",
      "Relatórios de performance",
      "Export CSV",
    ],
  },
  {
    id: "ultra",
    name: "Ultra",
    description: "Seu copiloto de trading. IA que analisa, aponta erros e te faz evoluir.",
    monthlyPrice: 49.9,
    annualPrice: 39.9,
    badge: "Mais resultados",
    features: [
      "Tudo do Pro, mais:",
      "Contas ilimitadas",
      "15 consultas AI Coach/dia",
      "Psicologia e tags avançadas",
      "Comparação de contas",
      "Alertas customizados",
      "Relatórios avançados (MFE/MAE, Sharpe)",
      "Export PDF",
      "Briefing on-demand",
      "Suporte prioritário",
    ],
  },
];

function fireConfetti() {
  const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 9999 };
  confetti({ ...defaults, particleCount: 50, origin: { x: 0.3, y: 0.6 } });
  confetti({ ...defaults, particleCount: 50, origin: { x: 0.7, y: 0.6 } });
}

/** Determine the button label and action for a tier card */
function getButtonState(
  tierId: Plan,
  currentPlan: Plan,
  currentInterval: "month" | "year" | null,
  viewingAnnual: boolean,
): { label: string; action: "none" | "subscribe" | "upgrade" | "downgrade" | "manage"; disabled: boolean; icon?: "up" | "down" } {
  const isPaid = currentPlan !== "free";
  const currentIsAnnual = currentInterval === "year";

  // Free card: always disabled/dimmed if user has a paid plan
  if (tierId === "free") {
    if (currentPlan === "free") {
      return { label: "Plano atual", action: "none", disabled: true };
    }
    return { label: "Plano atual", action: "none", disabled: true };
  }

  // Exact match: same tier AND same interval
  if (tierId === currentPlan && ((viewingAnnual && currentIsAnnual) || (!viewingAnnual && !currentIsAnnual))) {
    return { label: "Plano atual", action: "manage", disabled: false };
  }

  // Same tier, different interval (e.g., Ultra Monthly viewing Annual tab)
  if (tierId === currentPlan && viewingAnnual && !currentIsAnnual) {
    return { label: "Upgrade para Anual", action: "upgrade", disabled: false, icon: "up" };
  }
  if (tierId === currentPlan && !viewingAnnual && currentIsAnnual) {
    return { label: "Mudar para Mensal", action: "subscribe", disabled: false };
  }

  // Different tier
  if (!isPaid) {
    return { label: "Assinar", action: "subscribe", disabled: false };
  }

  const tierRank = PLAN_RANK[tierId];
  const currentRank = PLAN_RANK[currentPlan];

  // Viewing annual tab while on monthly — any paid tier is an upgrade
  if (viewingAnnual && !currentIsAnnual) {
    return { label: "Upgrade para Anual", action: "upgrade", disabled: false, icon: "up" };
  }

  // Same interval comparison
  if (tierRank > currentRank) {
    return { label: "Upgrade", action: "upgrade", disabled: false, icon: "up" };
  }
  if (tierRank < currentRank) {
    return { label: "Downgrade", action: "downgrade", disabled: false, icon: "down" };
  }

  return { label: "Assinar", action: "subscribe", disabled: false };
}

export function PricingCards() {
  const [annual, setAnnual] = useState(false);
  const [loadingTier, setLoadingTier] = useState<Plan | null>(null);
  const { plan: currentPlan, subscription } = useSubscription();

  const currentInterval = subscription?.billing_interval ?? null;

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
      if (!res.ok || !data.url) {
        console.error("[billing] Checkout error:", data.error || "No URL returned");
        alert(data.error || "Erro ao iniciar checkout. Tente novamente.");
        return;
      }
      window.location.href = data.url;
    } catch (err) {
      console.error("[billing] Checkout exception:", err);
      alert("Erro de conexão ao iniciar checkout. Tente novamente.");
    } finally {
      setLoadingTier(null);
    }
  }

  async function handleManageSubscription(tier?: Plan) {
    setLoadingTier(tier ?? currentPlan);
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
      if (!res.ok) {
        console.error("[billing] Portal error:", res.status === 404 ? "No active subscription" : (data.error || "Unknown error"));
        return;
      }
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (err) {
      console.error("[billing] Portal error:", err);
    } finally {
      setLoadingTier(null);
    }
  }

  function handleButtonClick(tierId: Plan, action: string) {
    if (action === "manage") {
      handleManageSubscription(tierId);
    } else if (action === "subscribe" || action === "upgrade" || action === "downgrade") {
      // Always use Checkout for new subscriptions, upgrades, and downgrades
      handleSubscribe(tierId);
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
            -25%
          </span>
        )}
      </div>

      {/* Cards */}
      <div className="grid gap-6 md:grid-cols-3">
        {tiers.map((tier) => {
          const price = annual ? tier.annualPrice : tier.monthlyPrice;
          const isFree = tier.id === "free";
          const btnState = getButtonState(tier.id, currentPlan, currentInterval, annual);
          const isCurrentCard = btnState.action === "manage" || (btnState.label === "Plano atual" && btnState.disabled);
          const isLoading = loadingTier === tier.id;

          return (
            <Card
              key={tier.id}
              className={cn(
                "relative flex flex-col rounded-[22px] p-6",
                tier.highlighted && "border-blue-500 border-2 shadow-lg",
                isCurrentCard && !isFree && "ring-2 ring-green-500/30"
              )}
              style={{ backgroundColor: "hsl(var(--card))" }}
            >
              {tier.badge && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-blue-600 px-3 py-1 text-xs font-semibold text-white">
                  {tier.badge}
                </span>
              )}

              <h3 className="text-lg font-semibold tracking-tight">{tier.name}</h3>
              {tier.description && (
                <p className="mt-1 text-sm text-muted-foreground">{tier.description}</p>
              )}

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
                  <li
                    key={f}
                    className={cn(
                      "flex items-start gap-2 text-sm",
                      f.includes("Dexter") ? "font-semibold text-foreground" : "text-muted-foreground"
                    )}
                  >
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-green-500" />
                    {f}
                  </li>
                ))}
              </ul>

              <div className="mt-6 space-y-2">
                <Button
                  className={cn(
                    "w-full rounded-full",
                    btnState.action === "manage" && "bg-green-600 text-white hover:bg-green-700",
                    btnState.action === "upgrade" && "bg-blue-600 text-white hover:bg-blue-700",
                    btnState.action === "downgrade" && "border-orange-500/50 text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-950/20",
                    btnState.disabled && isFree && currentPlan !== "free" && "opacity-40",
                  )}
                  variant={
                    btnState.action === "manage" ? "default"
                      : btnState.action === "upgrade" ? "default"
                      : btnState.action === "downgrade" ? "outline"
                      : btnState.disabled ? "outline"
                      : tier.highlighted ? "default" : "outline"
                  }
                  disabled={btnState.disabled || isLoading}
                  onClick={() => handleButtonClick(tier.id, btnState.action)}
                >
                  {isLoading ? (
                    "Redirecionando..."
                  ) : (
                    <span className="inline-flex items-center gap-1.5">
                      {btnState.icon === "up" && <ArrowUp className="h-3.5 w-3.5" />}
                      {btnState.icon === "down" && <ArrowDown className="h-3.5 w-3.5" />}
                      {btnState.label}
                    </span>
                  )}
                </Button>

                {/* "Gerenciar assinatura" link on the current plan card */}
                {btnState.action === "manage" && (
                  <button
                    type="button"
                    onClick={() => handleManageSubscription(tier.id)}
                    className="w-full text-center text-xs text-muted-foreground hover:text-foreground transition-colors underline underline-offset-2"
                  >
                    Gerenciar assinatura
                  </button>
                )}
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
