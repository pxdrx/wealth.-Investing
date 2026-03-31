"use client";

import { PricingCards } from "@/components/billing/PricingCards";
import { FeedbackDialog } from "@/components/feedback/FeedbackDialog";

export default function PricingPage() {
  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <h1 className="text-2xl font-semibold tracking-tight">Planos</h1>
      <p className="text-sm text-muted-foreground mb-8">
        Escolha o plano ideal para sua evolucao como trader.
      </p>
      <PricingCards />
      <FeedbackDialog />
    </div>
  );
}
