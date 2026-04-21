// Manual Supabase sign-out. CLAUDE.md forbids supabase.auth.signOut() —
// we clear the token from localStorage ourselves and navigate hard so the
// AuthGate resets from a clean slate.
export function logout() {
  const projectRef = process.env.NEXT_PUBLIC_SUPABASE_URL?.split("//")[1]?.split(".")[0] ?? "";
  const key = `sb-${projectRef}-auth-token`;
  try {
    localStorage.removeItem(key);
    sessionStorage.clear();
  } catch {
    // storage unavailable — fall through to the hard navigation anyway
  }
  window.location.href = "/login";
}
