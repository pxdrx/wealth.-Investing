"use client";

import { useEffect, useState } from "react";
import { CheckCircle } from "lucide-react";
import Link from "next/link";
import { useSubscription } from "@/components/context/SubscriptionContext";
import {
  ProOnboardingModal,
  hasSeenProOnboarding,
  markProOnboardingSeen,
} from "@/components/billing/ProOnboardingModal";

export default function SubscriptionSuccessPage() {
  const { refreshSubscription, plan } = useSubscription();
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    refreshSubscription();
    // Show onboarding if user hasn't seen it yet
    if (!hasSeenProOnboarding()) {
      setShowOnboarding(true);
    }
  }, [refreshSubscription]);

  return (
    <>
      <div className="mx-auto max-w-md px-6 py-20 text-center">
        <CheckCircle className="mx-auto h-16 w-16 text-green-500 mb-6" />
        <h1 className="text-2xl font-semibold tracking-tight mb-2">
          Assinatura ativada!
        </h1>
        <p className="text-muted-foreground mb-8">
          Seu plano {plan === "ultra" ? "Ultra" : "Pro"} está ativo. Aproveite
          todos os recursos.
        </p>
        <Link
          href="/app"
          className="inline-flex rounded-full bg-blue-600 px-8 py-3 text-sm font-medium text-white transition-colors hover:bg-blue-700"
        >
          Ir para o Dashboard
        </Link>
      </div>

      <ProOnboardingModal
        open={showOnboarding}
        plan={plan === "ultra" ? "ultra" : "pro"}
        onClose={() => {
          markProOnboardingSeen();
          setShowOnboarding(false);
        }}
      />
    </>
  );
}
