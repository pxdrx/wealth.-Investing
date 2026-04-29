// Central kill-switch helper. Reads `KILL_SWITCH_<NAME>` env var
// (case-insensitive, hyphens normalized to underscores). When set to
// "1" or "true", the caller should short-circuit instead of running.
// Designed for hot-toggling cron fan-outs from Vercel env without redeploy.
export function killSwitchActive(name: string): boolean {
  const v = process.env[`KILL_SWITCH_${name.toUpperCase().replace(/-/g, "_")}`];
  if (!v) return false;
  return v === "1" || v.toLowerCase() === "true";
}
