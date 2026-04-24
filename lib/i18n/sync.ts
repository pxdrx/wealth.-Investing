// Cross-device locale sync: reconcile the user's persisted preferred_locale
// (profiles.preferred_locale) with the current NEXT_LOCALE cookie, and
// backfill the DB when the user has a cookie but no DB row value yet.
//
// Runs client-side from AuthGate after the Supabase session resolves.
// All failures are swallowed — locale sync must never block auth or crash
// the app.

import {
  getMyProfile,
  updateMyPreferredLocale,
  type ProfileLocale,
} from "@/lib/profile";

const COOKIE_NAME = "NEXT_LOCALE";
const SYNC_FLAG_KEY = "__locale_synced_once";

function readCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie
    .split("; ")
    .find((row) => row.startsWith(`${name}=`));
  return match ? decodeURIComponent(match.slice(name.length + 1)) : null;
}

function writeCookie(value: ProfileLocale): void {
  if (typeof document === "undefined") return;
  document.cookie = `${COOKIE_NAME}=${value};path=/;max-age=31536000;samesite=lax`;
}

function isProfileLocale(v: unknown): v is ProfileLocale {
  return v === "pt" || v === "en";
}

/**
 * Reconcile cookie ↔ profiles.preferred_locale exactly once per tab session.
 *
 * Behavior:
 *   1. If DB has preferred_locale and it differs from the cookie → overwrite
 *      cookie and reload (once per tab — sessionStorage guards the loop).
 *   2. If DB has no preferred_locale but cookie is set → backfill DB with the
 *      cookie value so future sessions inherit it.
 *   3. If neither is set → no-op. User stays on default PT until they toggle.
 */
export async function syncLocaleFromProfile(): Promise<void> {
  if (typeof window === "undefined") return;

  // Guard against reload-loop: only run the cookie-rewrite+reload path once
  // per tab. Further toggles (LocaleSwitcher) write cookie + DB directly.
  let alreadySynced = false;
  try {
    alreadySynced = window.sessionStorage.getItem(SYNC_FLAG_KEY) === "1";
  } catch {
    // sessionStorage unavailable (e.g. Safari private) — proceed without guard.
  }

  let profile;
  try {
    profile = await getMyProfile();
  } catch {
    return; // Network blip or RLS hiccup — skip silently.
  }
  if (!profile) return;

  const cookieRaw = readCookie(COOKIE_NAME);
  const cookieLocale: ProfileLocale | null = isProfileLocale(cookieRaw)
    ? cookieRaw
    : null;
  const dbLocale = profile.preferred_locale;

  if (dbLocale && dbLocale !== cookieLocale) {
    if (alreadySynced) return; // Already reloaded this tab — don't loop.
    try {
      window.sessionStorage.setItem(SYNC_FLAG_KEY, "1");
    } catch {
      // no-op
    }
    writeCookie(dbLocale);
    window.location.reload();
    return;
  }

  if (!dbLocale && cookieLocale) {
    // Backfill: user has a cookie choice but no DB record yet.
    // Fire-and-forget; errors already swallowed in updateMyPreferredLocale.
    void updateMyPreferredLocale(cookieLocale);
  }
}
