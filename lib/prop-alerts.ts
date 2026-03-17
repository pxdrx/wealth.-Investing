import { SupabaseClient } from "@supabase/supabase-js";

export interface PropAlert {
  id: string;
  user_id: string;
  account_id: string;
  alert_type: "daily_dd" | "overall_dd";
  threshold_pct: number;
  current_pct: number;
  message: string;
  dismissed: boolean;
  created_at: string;
}

const THRESHOLDS = [50, 70, 90];

function buildMessage(
  alertType: "daily_dd" | "overall_dd",
  thresholdPct: number,
  currentPct: number,
  limitPct: number
): string {
  const label = alertType === "daily_dd" ? "Drawdown diário" : "Drawdown geral";
  return `${label} atingiu ${thresholdPct}% do limite (${currentPct.toFixed(1)}% de ${limitPct.toFixed(1)}%)`;
}

export async function checkAndCreateAlerts(
  supabase: SupabaseClient,
  accountId: string,
  userId: string,
  dailyDdPct: number,
  overallDdPct: number,
  maxDailyLossPct: number,
  maxOverallLossPct: number
): Promise<PropAlert[]> {
  const newAlerts: PropAlert[] = [];

  const checks: {
    alertType: "daily_dd" | "overall_dd";
    currentPct: number;
    limitPct: number;
  }[] = [
    { alertType: "daily_dd", currentPct: dailyDdPct, limitPct: maxDailyLossPct },
    { alertType: "overall_dd", currentPct: overallDdPct, limitPct: maxOverallLossPct },
  ];

  for (const check of checks) {
    if (check.limitPct <= 0) continue;

    const usagePct = (check.currentPct / check.limitPct) * 100;

    for (const threshold of THRESHOLDS) {
      if (usagePct < threshold) continue;

      // Check if alert already exists (dedup)
      const { data: existing, error: lookupError } = await supabase
        .from("prop_alerts")
        .select("id")
        .eq("user_id", userId)
        .eq("account_id", accountId)
        .eq("alert_type", check.alertType)
        .eq("threshold_pct", threshold)
        .eq("dismissed", false)
        .maybeSingle();

      if (lookupError) {
        console.error("Error checking existing alert:", lookupError);
        continue;
      }

      if (existing) continue;

      const message = buildMessage(
        check.alertType,
        threshold,
        check.currentPct,
        check.limitPct
      );

      const { data: inserted, error: insertError } = await supabase
        .from("prop_alerts")
        .insert({
          user_id: userId,
          account_id: accountId,
          alert_type: check.alertType,
          threshold_pct: threshold,
          current_pct: check.currentPct,
          message,
          dismissed: false,
        })
        .select()
        .maybeSingle();

      if (insertError) {
        console.error("Error creating alert:", insertError);
        continue;
      }

      if (inserted) {
        newAlerts.push(inserted as PropAlert);
      }
    }
  }

  return newAlerts;
}

export async function dismissAlert(
  supabase: SupabaseClient,
  alertId: string,
  userId: string
): Promise<void> {
  const { error } = await supabase
    .from("prop_alerts")
    .update({ dismissed: true })
    .eq("id", alertId)
    .eq("user_id", userId);

  if (error) {
    console.error("Error dismissing alert:", error);
    throw error;
  }
}

export async function getActiveAlerts(
  supabase: SupabaseClient,
  accountId: string,
  userId: string
): Promise<PropAlert[]> {
  const { data, error } = await supabase
    .from("prop_alerts")
    .select("*")
    .eq("user_id", userId)
    .eq("account_id", accountId)
    .eq("dismissed", false)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching active alerts:", error);
    throw error;
  }

  return (data ?? []) as PropAlert[];
}
