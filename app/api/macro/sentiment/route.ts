import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/service";

export const revalidate = 3600;
export const runtime = "nodejs";

type SentimentSource = "crypto_fng" | "stocks_fng" | "vix";
type Overall = "risk_on" | "neutral" | "risk_off";

interface SentimentReading {
  value: number | null;
  label: string | null;
}

interface SentimentSnapshot {
  source: SentimentSource;
  value: number | null;
  label: string | null;
  raw: Record<string, unknown> | null;
}

// ---- Helpers ---------------------------------------------------------------

function classifyFearGreed(value: number): string {
  if (value < 25) return "Extreme Fear";
  if (value < 45) return "Fear";
  if (value <= 55) return "Neutral";
  if (value <= 75) return "Greed";
  return "Extreme Greed";
}

function classifyVix(value: number): string {
  if (value < 13) return "Complacent";
  if (value < 17) return "Calm";
  if (value <= 25) return "Elevated";
  if (value <= 35) return "High";
  return "Extreme";
}

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: {
      "User-Agent": "wealth.investing/1.0 (+https://wealth.investing)",
      Accept: "application/json",
      ...(init?.headers ?? {}),
    },
    next: { revalidate: 3600 },
  });
  if (!res.ok) {
    throw new Error(`fetch_failed_${res.status}`);
  }
  return (await res.json()) as T;
}

// ---- Providers -------------------------------------------------------------

async function fetchCryptoFng(): Promise<SentimentSnapshot> {
  interface AltMeFng {
    data?: Array<{ value?: string; value_classification?: string; timestamp?: string }>;
  }
  const json = await fetchJson<AltMeFng>("https://api.alternative.me/fng/?limit=1");
  const item = json.data?.[0];
  const value = item?.value ? Number(item.value) : NaN;
  if (!Number.isFinite(value)) throw new Error("invalid_crypto_fng");
  return {
    source: "crypto_fng",
    value,
    label: item?.value_classification ?? classifyFearGreed(value),
    raw: item as Record<string, unknown>,
  };
}

async function fetchStocksFng(): Promise<SentimentSnapshot> {
  interface CnnFng {
    fear_and_greed?: { score?: number; rating?: string; timestamp?: string };
  }
  // CNN public dataviz endpoint.
  const json = await fetchJson<CnnFng>(
    "https://production.dataviz.cnn.io/index/fearandgreed/graphdata",
    {
      headers: {
        // CNN returns 403 without a browser-like UA.
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36",
        Origin: "https://www.cnn.com",
        Referer: "https://www.cnn.com/",
      },
    },
  );
  const score = json.fear_and_greed?.score;
  if (typeof score !== "number" || !Number.isFinite(score)) {
    throw new Error("invalid_stocks_fng");
  }
  const rounded = Math.round(score);
  return {
    source: "stocks_fng",
    value: rounded,
    label: json.fear_and_greed?.rating ?? classifyFearGreed(rounded),
    raw: json.fear_and_greed as Record<string, unknown>,
  };
}

async function fetchVix(): Promise<SentimentSnapshot> {
  interface YahooChart {
    chart?: {
      result?: Array<{
        indicators?: { quote?: Array<{ close?: Array<number | null> }> };
        meta?: { regularMarketPrice?: number };
      }>;
    };
  }
  const json = await fetchJson<YahooChart>(
    "https://query1.finance.yahoo.com/v8/finance/chart/%5EVIX?range=1d&interval=1d",
  );
  const result = json.chart?.result?.[0];
  let value = result?.meta?.regularMarketPrice;
  if (typeof value !== "number" || !Number.isFinite(value)) {
    const closes = result?.indicators?.quote?.[0]?.close ?? [];
    for (let i = closes.length - 1; i >= 0; i -= 1) {
      const c = closes[i];
      if (typeof c === "number" && Number.isFinite(c)) {
        value = c;
        break;
      }
    }
  }
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error("invalid_vix");
  }
  const rounded = Math.round(value * 100) / 100;
  return {
    source: "vix",
    value: rounded,
    label: classifyVix(rounded),
    raw: { regularMarketPrice: rounded },
  };
}

// ---- DB persistence + fallback --------------------------------------------

async function persistSnapshots(snapshots: SentimentSnapshot[]): Promise<void> {
  if (snapshots.length === 0) return;
  try {
    const supabase = createServiceRoleClient();
    const rows = snapshots.map((s) => ({
      source: s.source,
      value: s.value,
      label: s.label,
      raw: s.raw,
    }));
    await supabase.from("macro_sentiment").insert(rows);
  } catch (err) {
    // Persistence is best-effort; never fail the request.
    // eslint-disable-next-line no-console
    console.warn("[macro/sentiment] persistSnapshots error:", err);
  }
}

async function loadLatestFromDb(): Promise<Partial<Record<SentimentSource, SentimentSnapshot>>> {
  const out: Partial<Record<SentimentSource, SentimentSnapshot>> = {};
  try {
    const supabase = createServiceRoleClient();
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const sources: SentimentSource[] = ["crypto_fng", "stocks_fng", "vix"];
    await Promise.all(
      sources.map(async (src) => {
        const { data } = await supabase
          .from("macro_sentiment")
          .select("source, value, label, raw")
          .eq("source", src)
          .gt("captured_at", cutoff)
          .order("captured_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (data) {
          out[src] = {
            source: src,
            value: (data as { value: number | null }).value,
            label: (data as { label: string | null }).label,
            raw: (data as { raw: Record<string, unknown> | null }).raw ?? null,
          };
        }
      }),
    );
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn("[macro/sentiment] loadLatestFromDb error:", err);
  }
  return out;
}

// ---- Overall classification ------------------------------------------------

function deriveOverall(
  crypto: SentimentReading,
  stocks: SentimentReading,
  vix: SentimentReading,
): Overall {
  const fngValues: number[] = [];
  if (typeof crypto.value === "number") fngValues.push(crypto.value);
  if (typeof stocks.value === "number") fngValues.push(stocks.value);
  const fngAvg = fngValues.length > 0
    ? fngValues.reduce((a, b) => a + b, 0) / fngValues.length
    : null;
  const vixValue = typeof vix.value === "number" ? vix.value : null;

  if ((fngAvg !== null && fngAvg < 30) || (vixValue !== null && vixValue > 25)) {
    return "risk_off";
  }
  if (fngAvg !== null && fngAvg > 70 && vixValue !== null && vixValue < 17) {
    return "risk_on";
  }
  return "neutral";
}

// ---- Route -----------------------------------------------------------------

export async function GET() {
  const [cryptoRes, stocksRes, vixRes] = await Promise.allSettled([
    fetchCryptoFng(),
    fetchStocksFng(),
    fetchVix(),
  ]);

  const snapshots: SentimentSnapshot[] = [];
  let crypto: SentimentReading = { value: null, label: null };
  let stocks: SentimentReading = { value: null, label: null };
  let vix: SentimentReading = { value: null, label: null };

  if (cryptoRes.status === "fulfilled") {
    snapshots.push(cryptoRes.value);
    crypto = { value: cryptoRes.value.value, label: cryptoRes.value.label };
  }
  if (stocksRes.status === "fulfilled") {
    snapshots.push(stocksRes.value);
    stocks = { value: stocksRes.value.value, label: stocksRes.value.label };
  }
  if (vixRes.status === "fulfilled") {
    snapshots.push(vixRes.value);
    vix = { value: vixRes.value.value, label: vixRes.value.label };
  }

  // Persist anything we got fresh.
  if (snapshots.length > 0) {
    await persistSnapshots(snapshots);
  }

  // Fill missing sources from DB fallback.
  const liveCount = snapshots.length;
  if (liveCount < 3) {
    const cache = await loadLatestFromDb();
    if (crypto.value === null && cache.crypto_fng) {
      crypto = { value: cache.crypto_fng.value, label: cache.crypto_fng.label };
    }
    if (stocks.value === null && cache.stocks_fng) {
      stocks = { value: cache.stocks_fng.value, label: cache.stocks_fng.label };
    }
    if (vix.value === null && cache.vix) {
      vix = { value: cache.vix.value, label: cache.vix.label };
    }
  }

  // If still nothing, return error.
  if (crypto.value === null && stocks.value === null && vix.value === null) {
    return NextResponse.json(
      { ok: false, error: "sentiment_unavailable" },
      { status: 503 },
    );
  }

  const overall = deriveOverall(crypto, stocks, vix);

  return NextResponse.json({
    ok: true,
    crypto,
    stocks,
    vix,
    overall,
    captured_at: new Date().toISOString(),
  });
}
