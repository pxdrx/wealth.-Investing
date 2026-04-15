"use client";

import { useState } from "react";
import confetti from "canvas-confetti";
import NumberFlow from "@number-flow/react";
import { Check, ArrowUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSubscription } from "@/components/context/SubscriptionContext";
import { safeGetSession } from "@/lib/supabase/safe-session";
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
    name: "Grátis",
    description: "Comece a registrar. Sem compromisso.",
    monthlyPrice: 0,
    annualPrice: 0,
    features: [
      "10 trades por mês",
      "1 conta",
      "3 consultas IA Coach/mês",
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
      "15 consultas IA Coach/mês",
      "Journal completo + tags",
      "Macroeconomia completa",
      "Headlines ao vivo",
      "Briefing macroeconômico",
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
      "15 consultas IA Coach/dia",
      "Psicologia e tags avançadas",
      "Comparação de contas",
      "Alertas customizados",
      "Relatórios avançados (MFE/MAE)",
      "Export PDF",
      "Dexter ilimitado",
      "Suporte prioritário",
    ],
  },
];

function fireConfetti() {
  const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 9999 };
  confetti({ ...defaults, particleCount: 50, origin: { x: 0.3, y: 0.6 } });
  confetti({ ...defaults, particleCount: 50, origin: { x: 0.7, y: 0.6 } });
}

/** Combined score: annual > monthly, then tier rank. Free = 0. */
function planScore(plan: Plan, interval: "month" | "year" | null): number {
  if (plan === "free") return 0;
  const base = PLAN_RANK[plan]; // pro=1, ultra=2, mentor=3
  return (interval === "year" ? 10 : 0) + base;
}

/** Determine the button label and action for a tier card.
 *  Rules: no downgrades. Show "Seu plano é superior" (disabled) instead.
 *  Annual always scores higher than monthly of the same tier.
 */
function getButtonState(
  tierId: Plan,
  currentPlan: Plan,
  currentInterval: "month" | "year" | null,
  viewingAnnual: boolean,
): { label: string; action: "none" | "subscribe" | "upgrade" | "manage"; disabled: boolean; icon?: "up" } {
  const cardInterval: "month" | "year" = viewingAnnual ? "year" : "month";
  const isPaid = currentPlan !== "free";

  // Free tier card
  if (tierId === "free") {
    if (currentPlan === "free") {
      return { label: "Plano atual", action: "none", disabled: true };
    }
    return { label: "Seu plano é superior", action: "none", disabled: true };
  }

  // Same plan + same interval = current plan card → manage via portal
  if (tierId === currentPlan && currentInterval === cardInterval) {
    return { label: "Plano atual", action: "manage", disabled: false };
  }

  // Unpaid user looking at any paid card
  if (!isPaid) {
    return { label: "Assinar", action: "subscribe", disabled: false };
  }

  // Paid user: compare combined scores
  const cardScore = planScore(tierId, cardInterval);
  const currentScore = planScore(currentPlan, currentInterval);

  if (cardScore > currentScore) {
    return { label: "Upgrade", action: "upgrade", disabled: false, icon: "up" };
  }

  // cardScore <= currentScore → already have equal or better
  return { label: "Seu plano é superior", action: "none", disabled: true };
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
    const controller = new AbortController();
    const fetchTimeout = setTimeout(() => controller.abort(), 15_000);
    try {
      const { data: { session } } = await safeGetSession();
      const token = session?.access_token;
      if (!token) {
        window.location.href = "/login?next=/pricing";
        return;
      }
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ plan: tier, interval: annual ? "year" : "month" }),
        signal: controller.signal,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.url) {
        console.error("[billing] Checkout error:", data.error || `HTTP ${res.status}`);
        alert(data.error || "Erro ao iniciar checkout. Tente novamente.");
        return;
      }
      window.location.href = data.url;
    } catch (err) {
      const msg = err instanceof Error && err.name === "AbortError"
        ? "A requisição demorou demais. Tente novamente."
        : "Erro de conexão ao iniciar checkout. Tente novamente.";
      console.error("[billing] Checkout exception:", err);
      alert(msg);
    } finally {
      clearTimeout(fetchTimeout);
      setLoadingTier(null);
    }
  }

  async function handleManageSubscription(tier?: Plan) {
    setLoadingTier(tier ?? currentPlan);
    const controller = new AbortController();
    const fetchTimeout = setTimeout(() => controller.abort(), 15_000);
    try {
      const { data: { session } } = await safeGetSession();
      const token = session?.access_token;
      if (!token) {
        window.location.href = "/login?next=/pricing";
        return;
      }
      const res = await fetch("/api/billing/portal", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        signal: controller.signal,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        console.error("[billing] Portal error:", res.status, data.code, data.error);
        const userMsg =
          data.error ||
          (res.status === 503 ? "Pagamento indisponível. Tente em instantes." :
            res.status === 502 ? "Portal de cobrança indisponível. Fale com o suporte." :
            res.status === 404 ? "Você ainda não tem uma assinatura ativa." :
            "Não foi possível abrir o portal de cobrança.");
        alert(userMsg);
        return;
      }
      if (data.url) window.location.href = data.url;
    } catch (err) {
      const msg = err instanceof Error && err.name === "AbortError"
        ? "A requisição demorou demais. Tente novamente."
        : "Erro de conexão. Tente novamente.";
      console.error("[billing] Portal error:", err);
      alert(msg);
    } finally {
      clearTimeout(fetchTimeout);
      setLoadingTier(null);
    }
  }

  function handleButtonClick(tierId: Plan, action: string) {
    if (action === "manage") {
      handleManageSubscription(tierId);
    } else if (action === "subscribe" || action === "upgrade") {
      handleSubscribe(tierId);
    }
    // action === "none" → no-op (disabled button)
  }

  return (
    <div className="space-y-10">
      {/* Monthly/Annual toggle */}
      <div className="flex items-center justify-center gap-3">
        <span className={cn("text-[13px] font-medium", !annual ? "text-foreground" : "text-muted-foreground")}>
          Mensal
        </span>
        <button
          type="button"
          role="switch"
          aria-checked={annual}
          aria-label="Alternar entre mensal e anual"
          onClick={handleToggle}
          className={cn(
            "relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors",
            annual ? "bg-zinc-900" : "bg-muted"
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
        <span className={cn("text-[13px] font-medium", annual ? "text-foreground" : "text-muted-foreground")}>
          Anual
        </span>
        {annual && (
          <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700">
            -25%
          </span>
        )}
      </div>

      {/* Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-6">
        {tiers.map((tier) => {
          const price = annual ? tier.annualPrice : tier.monthlyPrice;
          const isFree = tier.id === "free";
          const btnState = getButtonState(tier.id, currentPlan, currentInterval, annual);
          const isCurrentCard = btnState.action === "manage" || (btnState.label === "Plano atual" && btnState.disabled);
          const isLoading = loadingTier === tier.id;

          return (
            <div
              key={tier.id}
              className={cn(
                "relative rounded-[22px] border p-6 lg:p-8 flex flex-col transition-all",
                tier.highlighted
                  ? "bg-zinc-900 dark:bg-zinc-950 text-white border-zinc-900 shadow-xl lg:scale-[1.02]"
                  : "bg-card text-foreground border-border",
                isCurrentCard && !isFree && "ring-2 ring-emerald-500/40"
              )}
            >
              {tier.badge && (
                <span
                  className={cn(
                    "absolute -top-3 left-6 text-[9px] uppercase tracking-wider font-semibold rounded-full px-2.5 py-1",
                    tier.highlighted
                      ? "bg-violet-500 text-white"
                      : "bg-muted text-muted-foreground border border-border"
                  )}
                >
                  {tier.badge}
                </span>
              )}

              <div className="mb-4">
                <div className="text-[14px] font-semibold mb-1">{tier.name}</div>
                {tier.description && (
                  <p
                    className={cn(
                      "text-[12px] leading-snug",
                      tier.highlighted ? "text-zinc-400" : "text-muted-foreground"
                    )}
                  >
                    {tier.description}
                  </p>
                )}
              </div>

              <div className="flex items-baseline gap-1 mb-2">
                {isFree ? (
                  <span className="text-[32px] font-semibold tracking-tight">R$0</span>
                ) : (
                  <>
                    <span
                      className={cn(
                        "text-[14px] font-medium",
                        tier.highlighted ? "text-zinc-400" : "text-muted-foreground"
                      )}
                    >
                      R$
                    </span>
                    <NumberFlow
                      value={price}
                      format={{ minimumFractionDigits: 2, maximumFractionDigits: 2 }}
                      locales="pt-BR"
                      className="text-[32px] font-semibold tracking-tight"
                    />
                    <span className={tier.highlighted ? "text-zinc-400" : "text-muted-foreground"}>
                      /mês
                    </span>
                  </>
                )}
              </div>
              {!isFree && annual && (
                <p
                  className={cn(
                    "text-[11px] mb-4",
                    tier.highlighted ? "text-zinc-400" : "text-muted-foreground"
                  )}
                >
                  Cobrado anualmente
                </p>
              )}
              {(isFree || !annual) && <div className="mb-4" />}

              <button
                type="button"
                disabled={btnState.disabled || isLoading}
                onClick={() => handleButtonClick(tier.id, btnState.action)}
                className={cn(
                  "inline-flex items-center justify-center rounded-full px-5 py-2.5 text-[12px] font-medium transition-colors min-h-[44px] mb-6",
                  btnState.disabled && "opacity-50 cursor-not-allowed",
                  !btnState.disabled && tier.highlighted && "bg-white text-zinc-900 hover:bg-zinc-100",
                  !btnState.disabled && !tier.highlighted && "bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-white",
                  btnState.action === "manage" && "bg-emerald-600 text-white hover:bg-emerald-700"
                )}
              >
                {isLoading ? (
                  "Redirecionando..."
                ) : (
                  <span className="inline-flex items-center gap-1.5">
                    {btnState.icon === "up" && <ArrowUp className="h-3.5 w-3.5" />}
                    {btnState.label}
                  </span>
                )}
              </button>

              <ul className="space-y-2.5 flex-1">
                {tier.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-[13px] leading-snug">
                    <Check
                      className={cn(
                        "w-4 h-4 shrink-0 mt-0.5",
                        tier.highlighted ? "text-emerald-400" : "text-emerald-600"
                      )}
                    />
                    <span
                      className={cn(
                        tier.highlighted ? "text-zinc-200" : "text-foreground/80",
                        f.includes("Dexter") && "font-semibold"
                      )}
                    >
                      {f}
                    </span>
                  </li>
                ))}
              </ul>

              {btnState.action === "manage" && (
                <button
                  type="button"
                  onClick={() => handleManageSubscription(tier.id)}
                  className={cn(
                    "mt-6 w-full text-center text-[11px] underline underline-offset-2 transition-colors",
                    tier.highlighted ? "text-zinc-400 hover:text-white" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  Gerenciar assinatura
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
