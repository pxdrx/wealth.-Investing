"use client";

import { supabase } from "@/lib/supabase/client";

// Re-export shared types and utilities for existing consumers
export type { Plan, SubStatus, TierLimits } from "./subscription-shared";
export { getTierLimits, isProOrAbove, isUltra } from "./subscription-shared";

import type { Plan as PlanType, SubStatus as SubStatusType } from "./subscription-shared";

export interface SubscriptionRow {
  id: string;
  user_id: string;
  stripe_customer_id: string;
  stripe_subscription_id: string | null;
  plan: PlanType;
  status: SubStatusType;
  billing_interval: "month" | "year" | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
}

export async function fetchMySubscription(): Promise<SubscriptionRow | null> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user?.id) return null;

  const { data, error } = await supabase
    .from("subscriptions")
    .select("*")
    .eq("user_id", session.user.id)
    .maybeSingle();

  if (error) {
    console.warn("[subscription] fetch error:", error.message);
    return null;
  }
  return data as SubscriptionRow | null;
}
