"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { CheckCircle, AlertTriangle, Loader2 } from "lucide-react";
import Link from "next/link";
import { useSubscription } from "@/components/context/SubscriptionContext";
import { supabase } from "@/lib/supabase/client";
import {
  ProOnboardingModal,
  hasSeenProOnboarding,
  markProOnboardingSeen,
} from "@/components/billing/ProOnboardingModal";

type VerifyState = "loading" | "verified" | "failed";

function SubscriptionSuccessInner() {
  const { refreshSubscription, plan } = useSubscription();
  const searchParams = useSearchParams();
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [verifyState, setVerifyState] = useState<VerifyState>("loading");

  useEffect(() => {
    async function verifySession() {
      const sessionId = searchParams.get("session_id");
      if (!sessionId) {
        setVerifyState("failed");
        return;
      }

      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.access_token) {
          setVerifyState("failed");
          return;
        }

        const res = await fetch(
          `/api/billing/verify-session?session_id=${encodeURIComponent(sessionId)}`,
          { headers: { Authorization: `Bearer ${session.access_token}` } }
        );
        const json = await res.json();

        if (json.ok && json.verified) {
          setVerifyState("verified");
          refreshSubscription();
          if (!hasSeenProOnboarding()) {
            setShowOnboarding(true);
          }
        } else {
          setVerifyState("failed");
        }
      } catch {
        setVerifyState("failed");
      }
    }

    verifySession();
  }, [searchParams, refreshSubscription]);

  if (verifyState === "loading") {
    return (
      <div className="mx-auto max-w-md px-6 py-20 text-center">
        <Loader2 className="mx-auto h-12 w-12 text-muted-foreground animate-spin mb-6" />
        <p className="text-muted-foreground">Verificando pagamento...</p>
      </div>
    );
  }

  if (verifyState === "failed") {
    return (
      <div className="mx-auto max-w-md px-6 py-20 text-center">
        <AlertTriangle className="mx-auto h-16 w-16 text-amber-500 mb-6" />
        <h1 className="text-2xl font-semibold tracking-tight mb-2">
          Verificação pendente
        </h1>
        <p className="text-muted-foreground mb-8">
          Não foi possível confirmar o pagamento agora. Se você completou o checkout,
          seu plano será ativado em breve automaticamente.
        </p>
        <Link
          href="/app"
          className="inline-flex rounded-full bg-blue-600 px-8 py-3 text-sm font-medium text-white transition-colors hover:bg-blue-700"
        >
          Ir para o Dashboard
        </Link>
      </div>
    );
  }

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

export default function SubscriptionSuccessPage() {
  return (
    <Suspense fallback={
      <div className="mx-auto max-w-md px-6 py-20 text-center">
        <Loader2 className="mx-auto h-12 w-12 text-muted-foreground animate-spin mb-6" />
        <p className="text-muted-foreground">Carregando...</p>
      </div>
    }>
      <SubscriptionSuccessInner />
    </Suspense>
  );
}
