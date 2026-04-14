export type FeatureKey =
  | "journal"
  | "ai"
  | "macro"
  | "dexter"
  | "backtest"
  | "risk"
  | "mentor";

export interface FeatureMeta {
  key: FeatureKey;
  label: string;
}

export const FEATURES: readonly FeatureMeta[] = [
  { key: "journal", label: "Journal" },
  { key: "ai", label: "IA Coach" },
  { key: "macro", label: "Macroeconomia" },
  { key: "dexter", label: "Dexter" },
  { key: "backtest", label: "Backtest" },
  { key: "risk", label: "Risk" },
  { key: "mentor", label: "Mentor" },
] as const;

export const DEFAULT_FEATURE: FeatureKey = "journal";
