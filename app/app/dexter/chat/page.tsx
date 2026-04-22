"use client";

import { Suspense, useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { useActiveAccount } from "@/components/context/ActiveAccountContext";
import { useAuthEvent } from "@/components/context/AuthEventContext";
import { useEntitlements } from "@/hooks/use-entitlements";
import { PaywallGate } from "@/components/billing/PaywallGate";
import { safeGetSession } from "@/lib/supabase/safe-session";
import { CompanionClient } from "./CompanionClient";

function DexterChatPageInner() {
  const { activeAccountId } = useActiveAccount();
  const { session: ctxSession } = useAuthEvent();
  const { plan, isLoading } = useEntitlements();
  const [userId, setUserId] = useState<string | null>(ctxSession?.user?.id ?? null);
  const [checkingSession, setCheckingSession] = useState(!ctxSession);

  useEffect(() => {
    if (ctxSession?.user?.id) {
      setUserId(ctxSession.user.id);
      setCheckingSession(false);
      return;
    }
    let cancelled = false;
    (async () => {
      const { data: { session } } = await safeGetSession();
      if (cancelled) return;
      if (!session?.user?.id) {
        window.location.href = "/login";
        return;
      }
      setUserId(session.user.id);
      setCheckingSession(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [ctxSession]);

  if (checkingSession || isLoading || !userId) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (plan === "free") {
    return <PaywallGate requiredPlan="pro"><div /></PaywallGate>;
  }

  return (
    <CompanionClient
      plan={plan as "pro" | "ultra" | "mentor"}
      userId={userId}
      accountId={activeAccountId ?? null}
    />
  );
}

export default function DexterChatPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      }
    >
      <DexterChatPageInner />
    </Suspense>
  );
}
