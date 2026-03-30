"use client";

import { useSubscription } from "@/components/context/SubscriptionContext";
import { Crown } from "lucide-react";
import Link from "next/link";

interface PaywallGateProps {
  requiredPlan: "pro" | "ultra";
  children: React.ReactNode;
  fallback?: React.ReactNode;
  blurContent?: boolean;
}

function DefaultFallback({ requiredPlan }: { requiredPlan: "pro" | "ultra" }) {
  const label = requiredPlan === "pro" ? "Pro" : "Ultra";
  const priceHint = requiredPlan === "pro" ? "R$52" : "R$89";
  return (
    <div
      className="flex flex-col items-center justify-center gap-4 rounded-[22px] border border-border/60 px-8 py-10 text-center shadow-soft dark:shadow-soft-dark"
      style={{ backgroundColor: "hsl(var(--card))" }}
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/30">
        <Crown className="h-6 w-6 text-amber-600 dark:text-amber-400" />
      </div>
      <div className="flex flex-col gap-1">
        <p className="text-base font-semibold tracking-tight">
          Recurso exclusivo {label}
        </p>
        <p className="text-sm text-muted-foreground">
          Faca upgrade para desbloquear esta funcionalidade.
        </p>
      </div>
      <p className="text-xs text-muted-foreground">
        A partir de <span className="font-semibold text-foreground">{priceHint}/mes</span>
      </p>
      <Link
        href="/app/pricing"
        className="rounded-full bg-blue-600 px-8 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-700"
      >
        Ver planos
      </Link>
    </div>
  );
}

export function PaywallGate({ requiredPlan, children, fallback, blurContent = false }: PaywallGateProps) {
  const { plan, isLoading } = useSubscription();

  if (isLoading) return null;

  const hasAccess = requiredPlan === "pro"
    ? (plan === "pro" || plan === "ultra")
    : plan === "ultra";

  if (hasAccess) return <>{children}</>;

  if (blurContent) {
    return (
      <div className="relative overflow-hidden rounded-[22px]">
        <div className="pointer-events-none select-none blur-[6px] opacity-50" aria-hidden="true">
          {children}
        </div>
        <div className="absolute inset-0 flex items-center justify-center p-4">
          {fallback ?? <DefaultFallback requiredPlan={requiredPlan} />}
        </div>
      </div>
    );
  }

  return <>{fallback ?? <DefaultFallback requiredPlan={requiredPlan} />}</>;
}
