/**
 * Onboarding version gate.
 *
 * Bumping CURRENT_ONBOARDING_VERSION forces every existing user back into
 * the appropriate onboarding flow on their next /app visit:
 *   - Free / Trial  -> platform tour (OnboardingTour, 7 steps)
 *   - Pro / Ultra   -> ProOnboardingModal (plan-aware content)
 *   - Mentor        -> MentorOnboardingModal (server-side reset via SQL migration)
 *
 * Completion flags cleared by AppShell when the stored version is stale:
 *   - onboarding_tour_completed
 *   - wealth-onboarding-seen-pro
 *   - wealth-onboarding-seen-ultra
 *   - wealth-pro-onboarding-seen        (legacy, pre plan-specific refactor)
 *
 * After completion of the new version, the gating helpers (hasSeenProOnboarding,
 * OnboardingTour onComplete, etc.) re-set their flags and the version key
 * stops the redispatch from firing again.
 */

export const CURRENT_ONBOARDING_VERSION = "v2";
export const ONBOARDING_VERSION_KEY = "wealth_onboarding_version";

export function getStoredOnboardingVersion(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(ONBOARDING_VERSION_KEY);
  } catch {
    return null;
  }
}

export function setStoredOnboardingVersion(version: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(ONBOARDING_VERSION_KEY, version);
  } catch {
    // localStorage unavailable — ignore
  }
}

export function isOnboardingStale(): boolean {
  return getStoredOnboardingVersion() !== CURRENT_ONBOARDING_VERSION;
}
