/** FRED API — Federal Reserve Economic Data */

const FRED_KEY = process.env.FRED_API_KEY;

async function fetchSeries(seriesId: string, limit: number = 5): Promise<{ date: string; value: string }[] | null> {
  if (!FRED_KEY) return null;
  try {
    const url = `https://api.stlouisfed.org/fred/series/observations?series_id=${seriesId}&api_key=${FRED_KEY}&file_type=json&sort_order=desc&limit=${limit}`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const json = await res.json();
    return json.observations?.map((o: { date: string; value: string }) => ({ date: o.date, value: o.value })) ?? null;
  } catch {
    return null;
  }
}

export interface MacroEconomicData {
  fedFundsRate: string | null;
  cpiYoY: string | null;
  treasuryYield10Y: string | null;
  realGDP: string | null;
  unemploymentRate: string | null;
}

export async function getMacroEconomicData(): Promise<MacroEconomicData> {
  const [fedRate, cpi, treasury, gdp, unemployment] = await Promise.allSettled([
    fetchSeries("FEDFUNDS", 1),
    fetchSeries("CPIAUCSL", 2),
    fetchSeries("DGS10", 1),
    fetchSeries("GDPC1", 1),
    fetchSeries("UNRATE", 1),
  ]);
  return {
    fedFundsRate: fedRate.status === "fulfilled" && fedRate.value?.[0] ? `${fedRate.value[0].value}%` : null,
    cpiYoY: cpi.status === "fulfilled" && cpi.value && cpi.value.length >= 2
      ? `${((Number(cpi.value[0].value) / Number(cpi.value[1].value) - 1) * 100 * 12).toFixed(1)}%`
      : null,
    treasuryYield10Y: treasury.status === "fulfilled" && treasury.value?.[0] ? `${treasury.value[0].value}%` : null,
    realGDP: gdp.status === "fulfilled" && gdp.value?.[0] ? `$${(Number(gdp.value[0].value) / 1000).toFixed(1)}T` : null,
    unemploymentRate: unemployment.status === "fulfilled" && unemployment.value?.[0] ? `${unemployment.value[0].value}%` : null,
  };
}
