/**
 * Mock auth: cookie-based flag for "logged in" state.
 * Used by middleware (server) and header/login (client).
 */

export const AUTH_COOKIE_NAME = "trading-dashboard-auth";
const AUTH_VALUE = "true";
const MAX_AGE_DAYS = 7;

/** Set auth cookie (client-side). Call after "login". */
export function setAuth(): void {
  if (typeof document === "undefined") return;
  const maxAge = MAX_AGE_DAYS * 24 * 60 * 60;
  document.cookie = `${AUTH_COOKIE_NAME}=${AUTH_VALUE}; path=/; max-age=${maxAge}; SameSite=Lax`;
}

/** Clear auth cookie (client-side). Call on "logout". */
export function clearAuth(): void {
  if (typeof document === "undefined") return;
  document.cookie = `${AUTH_COOKIE_NAME}=; path=/; max-age=0; SameSite=Lax`;
}

/** Check if auth cookie is present (client-side). */
export function hasAuthCookie(): boolean {
  if (typeof document === "undefined") return false;
  return document.cookie
    .split(";")
    .some((c) => c.trim().startsWith(`${AUTH_COOKIE_NAME}=`));
}
