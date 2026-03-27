/** Deribit — Crypto Options Data (FREE public endpoints) */

const BASE = "https://www.deribit.com/api/v2/public";

export interface CryptoOptionsData {
  indexPrice: number | null;
  totalCallOI: number | null;
  totalPutOI: number | null;
  putCallRatio: number | null;
  avgCallIV: number | null;
  avgPutIV: number | null;
  ivSkew: number | null;
}

export async function getCryptoOptionsData(currency: string = "BTC"): Promise<CryptoOptionsData> {
  const result: CryptoOptionsData = {
    indexPrice: null, totalCallOI: null, totalPutOI: null,
    putCallRatio: null, avgCallIV: null, avgPutIV: null, ivSkew: null,
  };
  try {
    const indexRes = await fetch(`${BASE}/get_index_price?index_name=${currency.toLowerCase()}_usd`);
    if (indexRes.ok) {
      const json = await indexRes.json();
      result.indexPrice = json.result?.index_price ?? null;
    }

    const bookRes = await fetch(`${BASE}/get_book_summary_by_currency?currency=${currency}&kind=option`);
    if (bookRes.ok) {
      const json = await bookRes.json();
      const options = json.result ?? [];
      let callOI = 0, putOI = 0, callIVSum = 0, callIVCount = 0, putIVSum = 0, putIVCount = 0;
      for (const opt of options) {
        const name = (opt.instrument_name ?? "") as string;
        const oi = (opt.open_interest ?? 0) as number;
        const iv = (opt.mark_iv ?? 0) as number;
        if (name.endsWith("-C")) { callOI += oi; if (iv > 0) { callIVSum += iv; callIVCount++; } }
        else if (name.endsWith("-P")) { putOI += oi; if (iv > 0) { putIVSum += iv; putIVCount++; } }
      }
      result.totalCallOI = Math.round(callOI);
      result.totalPutOI = Math.round(putOI);
      result.putCallRatio = callOI > 0 ? Math.round((putOI / callOI) * 100) / 100 : null;
      result.avgCallIV = callIVCount > 0 ? Math.round(callIVSum / callIVCount * 100) / 100 : null;
      result.avgPutIV = putIVCount > 0 ? Math.round(putIVSum / putIVCount * 100) / 100 : null;
      if (result.avgPutIV != null && result.avgCallIV != null) {
        result.ivSkew = Math.round((result.avgPutIV - result.avgCallIV) * 100) / 100;
      }
    }
  } catch (err) {
    console.error("[deribit] Error:", err);
  }
  return result;
}
