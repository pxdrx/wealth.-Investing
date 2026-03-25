export interface AnalystConfig {
  maxIterations: number;
  model: string;
  ticker: string;
  assetType: "stock" | "forex" | "crypto" | "commodity" | "index";
}

export interface AnalystEvent {
  type: "thinking" | "tool_start" | "tool_end" | "tool_error" | "section_complete" | "done";
  data: {
    content?: string;
    toolName?: string;
    toolArgs?: Record<string, unknown>;
    toolResult?: string;
    section?: AnalysisSection;
    report?: AnalysisReport;
    error?: string;
  };
}

export interface AnalysisSection {
  title: string;
  content: string;
  bias?: "bullish" | "bearish" | "neutral";
  confidence?: "alta" | "media" | "baixa";
}

export interface AnalysisReport {
  ticker: string;
  assetType: string;
  generatedAt: string;
  sections: {
    macro: AnalysisSection;
    technical: AnalysisSection;
    fundamental: AnalysisSection;
    sentiment: AnalysisSection;
    risk: AnalysisSection;
  };
  verdict: {
    bias: "bullish" | "bearish" | "neutral";
    confidence: "alta" | "media" | "baixa";
    summary: string;
    keyLevels: string[];
    tradeIdea: string;
  };
}

export type AssetType = "stock" | "forex" | "crypto" | "commodity" | "index";

export function detectAssetType(ticker: string): AssetType {
  const t = ticker.toUpperCase();
  // Forex pairs
  if (/^[A-Z]{6}$/.test(t) && /USD|EUR|GBP|JPY|CHF|AUD|CAD|NZD/.test(t)) return "forex";
  // Crypto
  if (/BTC|ETH|SOL|XRP|ADA|DOT|DOGE|AVAX|MATIC|LINK/.test(t) && t.length <= 7) return "crypto";
  if (t.endsWith("USDT") || (t.endsWith("USD") && t.length <= 10 && !/^[A-Z]{6}$/.test(t))) return "crypto";
  // Commodities
  if (["XAUUSD", "XAGUSD", "WTIUSD", "BRENT", "GOLD", "SILVER", "OIL", "NATGAS"].includes(t)) return "commodity";
  // Indices
  if (["SPX", "NDX", "DJI", "DAX", "FTSE", "NIKKEI", "IBOV", "VIX", "DXY", "US500", "US30", "US100"].includes(t)) return "index";
  // Default: stock
  return "stock";
}
