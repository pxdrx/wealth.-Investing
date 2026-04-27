// Market bias classifier for daily briefing.
// Spec was VIX/DXY/SPX thresholds, but the repo's macro layer surfaces
// pre-classified asset biases via weekly_panoramas.asset_impacts (analyst
// narrative output, refreshed weekly + daily adjustments). Reusing those
// bypasses the need for a raw VIX/SPX feed and stays consistent with what
// the user already sees in /app/macro.

import type { AssetImpacts } from "@/lib/macro/types";
import type { MarketBias } from "../__mocks__/types";

export function classifyBias(asset_impacts: AssetImpacts | null): MarketBias {
  if (!asset_impacts) return "neutral";
  const indices = asset_impacts.indices?.bias;
  const dollar = asset_impacts.dollar?.bias;
  if (indices === "bullish" && dollar === "bearish") return "risk-on";
  if (indices === "bearish" && dollar === "bullish") return "risk-off";
  return "neutral";
}
