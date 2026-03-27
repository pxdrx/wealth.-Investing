/** Alternative.me — Fear & Greed Index */

export async function getFearGreedIndex(): Promise<{
  value: number;
  classification: string;
  timestamp: string;
} | null> {
  try {
    const res = await fetch("https://api.alternative.me/fng/?limit=1&format=json");
    if (!res.ok) return null;
    const json = await res.json();
    const d = json.data?.[0];
    if (!d) return null;
    return {
      value: Number(d.value),
      classification: d.value_classification,
      timestamp: new Date(Number(d.timestamp) * 1000).toISOString(),
    };
  } catch {
    return null;
  }
}
