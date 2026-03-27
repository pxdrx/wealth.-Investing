/** Blockchain.info — BTC on-chain data (FREE, no auth) */

function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

async function fetchChart(metric: string, timespan: string = "30days"): Promise<{ x: number; y: number }[] | null> {
  try {
    const res = await fetch(`https://api.blockchain.info/charts/${metric}?timespan=${timespan}&format=json&cors=true`);
    if (!res.ok) return null;
    const json = await res.json();
    return json.values ?? null;
  } catch {
    return null;
  }
}

async function fetchQuery(endpoint: string): Promise<number | null> {
  try {
    const res = await fetch(`https://blockchain.info/q/${endpoint}`);
    if (!res.ok) return null;
    const text = await res.text();
    return Number(text) || null;
  } catch {
    return null;
  }
}

export interface BTCOnChainData {
  hashrate: number | null;
  difficulty: number | null;
  difficultyChange30d: number | null;
  transactionFeesUsd: number | null;
  minerRevenueUsd: number | null;
  blockReward: number | null;
  estimatedMiningCost: number | null;
}

export async function getBTCOnChainData(): Promise<BTCOnChainData> {
  const result: BTCOnChainData = {
    hashrate: null, difficulty: null, difficultyChange30d: null,
    transactionFeesUsd: null, minerRevenueUsd: null, blockReward: null, estimatedMiningCost: null,
  };
  try {
    const hashrateData = await fetchChart("hash-rate", "30days");
    if (hashrateData?.length) {
      result.hashrate = Math.round(hashrateData[hashrateData.length - 1].y / 1e6 * 100) / 100;
    }
    await delay(11000);

    const diffData = await fetchChart("difficulty", "60days");
    if (diffData && diffData.length > 1) {
      result.difficulty = diffData[diffData.length - 1].y;
      result.difficultyChange30d = Math.round(((diffData[diffData.length - 1].y - diffData[0].y) / diffData[0].y) * 10000) / 100;
    }
    await delay(11000);

    const feesData = await fetchChart("transaction-fees-usd", "30days");
    if (feesData?.length) {
      result.transactionFeesUsd = Math.round(feesData.reduce((s, v) => s + v.y, 0) / feesData.length * 100) / 100;
    }
    await delay(11000);

    const revenueData = await fetchChart("miners-revenue", "30days");
    if (revenueData?.length) {
      result.minerRevenueUsd = Math.round(revenueData.reduce((s, v) => s + v.y, 0) / revenueData.length * 100) / 100;
    }
    await delay(11000);

    result.blockReward = await fetchQuery("bcperblock");
    if (result.blockReward) result.blockReward = result.blockReward / 1e8;

    if (result.hashrate && result.blockReward) {
      const hashrateTH = result.hashrate * 1e6;
      const dailyEnergyCostUSD = (hashrateTH * 25 * 0.05 * 86400) / (1000 * 3600);
      const dailyBTCMined = 144 * result.blockReward;
      if (dailyBTCMined > 0) result.estimatedMiningCost = Math.round(dailyEnergyCostUSD / dailyBTCMined);
    }
  } catch (err) {
    console.error("[blockchain-info] Error:", err);
  }
  return result;
}
