/**
 * Shared types for the server-backed onboarding state.
 * Source of truth lives in the `user_onboarding` Supabase table; localStorage
 * (key `wealth_onboarding_state_v1`) is a hydration cache only.
 */

export type TierName = "free" | "pro" | "ultra" | "mentor";

export const TIER_RANK: Record<TierName, number> = {
  free: 0,
  pro: 1,
  ultra: 2,
  mentor: 3,
};

export const TIER_NAMES: readonly TierName[] = ["free", "pro", "ultra", "mentor"] as const;

export function isTierName(value: unknown): value is TierName {
  return typeof value === "string" && (TIER_NAMES as readonly string[]).includes(value);
}

export interface OnboardingState {
  tourCompletedAt: string | null;
  maxTierSeen: TierName;
}
