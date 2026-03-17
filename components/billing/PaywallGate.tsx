"use client";

import { useSubscription } from "@/components/context/SubscriptionContext";
import { Lock } from "lucide-react";
import Link from "next/link";

interface PaywallGateProps {
  requiredPlan: "pro" | "elite";
  children: React.ReactNode;
  fallback?: React.ReactNode;
  blurContent?: boolean;
}

function DefaultFallback({ requiredPlan }: { requiredPlan: "pro" | "elite" }) {
  const label = requiredPlan === "pro" ? "Pro" : "Elite";
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-[22px] border border-border/60 px-6 py-12 text-center"
      style={{ backgroundColor: "hsl(var(--card))" }}>
      <Lock className="h-8 w-8 text-muted-foreground" />
      <p className="text-sm font-medium">Recurso disponível no plano {label}</p>
      <Link
        href="/app/pricing"
        className="rounded-full bg-blue-600 px-6 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
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
    ? (plan === "pro" || plan === "elite")
    : plan === "elite";

  if (hasAccess) return <>{children}</>;

  if (blurContent) {
    return (
      <div className="relative">
        <div className="pointer-events-none select-none blur-sm">{children}</div>
        <div className="absolute inset-0 flex items-center justify-center">
          {fallback ?? <DefaultFallback requiredPlan={requiredPlan} />}
        </div>
      </div>
    );
  }

  return <>{fallback ?? <DefaultFallback requiredPlan={requiredPlan} />}</>;
}
