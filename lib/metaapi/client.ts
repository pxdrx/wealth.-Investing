/**
 * MetaAPI REST client — pure fetch, no SDK dependency.
 * Uses the official Provisioning API documented at:
 * https://metaapi.cloud/docs/provisioning/api/account/
 */

const PROVISIONING_API = "https://mt-provisioning-api-v1.agiliumtrade.agiliumtrade.ai";

/** Build regional Trading API URL. Region comes from account's provisioning data. */
function tradingApiUrl(region: string): string {
  return `https://mt-client-api-v1.${region}.agiliumtrade.ai`;
}

function getToken(): string {
  const token = process.env.METAAPI_TOKEN;
  if (!token) throw new Error("METAAPI_TOKEN not configured");
  return token;
}

function randomTransactionId(): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < 32; i++) {
    result += chars[Math.floor(Math.random() * chars.length)];
  }
  return result;
}

export interface ProvisionResult {
  metaApiAccountId: string;
  state: string;
}

export interface MetaApiAccountStatus {
  state: string;
  connectionStatus: string;
  name: string;
  login: string;
  server: string;
  platform: string;
  type: string;
  region: string;
}

export interface AccountSnapshot {
  equity: number;
  balance: number;
  margin: number;
  freeMargin: number;
  currency: string;
  broker: string;
  leverage: number;
  investorMode: boolean;
}

/**
 * Fetches live account information (equity, balance, margin, positions) from MetaAPI Trading API.
 * Requires account to be DEPLOYED + CONNECTED. Uses regional URL.
 */
export async function getAccountInfo(
  metaApiAccountId: string,
  region?: string
): Promise<AccountSnapshot> {
  const token = getToken();
  const accountRegion = region || (await getAccountStatus(metaApiAccountId)).region || "vint-hill";
  const baseUrl = tradingApiUrl(accountRegion);
  const url = `${baseUrl}/users/current/accounts/${metaApiAccountId}/account-information`;

  const res = await fetch(url, {
    headers: { "auth-token": token },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`MetaAPI getAccountInfo ${res.status}: ${text.slice(0, 300)}`);
  }

  return res.json();
}

/**
 * Fetches open positions from MetaAPI Trading API.
 */
export async function getOpenPositions(
  metaApiAccountId: string,
  region?: string
): Promise<LivePosition[]> {
  const token = getToken();
  const accountRegion = region || (await getAccountStatus(metaApiAccountId)).region || "vint-hill";
  const baseUrl = tradingApiUrl(accountRegion);
  const url = `${baseUrl}/users/current/accounts/${metaApiAccountId}/positions`;

  const res = await fetch(url, {
    headers: { "auth-token": token },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`MetaAPI getPositions ${res.status}: ${text.slice(0, 300)}`);
  }

  return res.json();
}

export interface LivePosition {
  id: string;
  symbol: string;
  type: string;
  volume: number;
  openPrice: number;
  currentPrice: number;
  profit: number;
  swap: number;
  commission: number;
  stopLoss: number | null;
  takeProfit: number | null;
  openTime: string;
  comment: string;
  magic: number;
}

/**
 * Creates a MetaAPI cloud account via REST API.
 * Docs: https://metaapi.cloud/docs/provisioning/api/account/createAccount/
 */
export async function provisionAccount(
  login: string,
  investorPassword: string,
  server: string,
  accountName: string,
  platform: "mt4" | "mt5" = "mt5"
): Promise<ProvisionResult> {
  const token = getToken();
  const txId = randomTransactionId();

  const body = {
    login,
    password: investorPassword,
    name: accountName,
    server,
    platform,
    magic: 1000,
  };

  const res = await fetch(`${PROVISIONING_API}/users/current/accounts`, {
    method: "POST",
    headers: {
      "auth-token": token,
      "transaction-id": txId,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const text = await res.text();

  if (!res.ok) {
    throw new Error(`MetaAPI createAccount ${res.status}: ${text.slice(0, 300)}`);
  }

  const data = JSON.parse(text);
  return {
    metaApiAccountId: data.id,
    state: data.state || "CREATED",
  };
}

/**
 * Gets MetaAPI account status via REST API.
 */
export async function getAccountStatus(metaApiAccountId: string): Promise<MetaApiAccountStatus> {
  const token = getToken();

  const res = await fetch(`${PROVISIONING_API}/users/current/accounts/${metaApiAccountId}`, {
    headers: { "auth-token": token },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`MetaAPI getAccount ${res.status}: ${text.slice(0, 300)}`);
  }

  return res.json();
}

/**
 * Deploys a MetaAPI account (starts cloud terminal).
 */
export async function deployAccount(metaApiAccountId: string): Promise<void> {
  const token = getToken();

  const res = await fetch(`${PROVISIONING_API}/users/current/accounts/${metaApiAccountId}/deploy`, {
    method: "POST",
    headers: { "auth-token": token },
  });

  if (!res.ok && res.status !== 409) {
    // 409 = already deployed, that's fine
    const text = await res.text();
    throw new Error(`MetaAPI deploy ${res.status}: ${text.slice(0, 300)}`);
  }
}

/**
 * Undeploys a MetaAPI account (stops cloud terminal).
 */
export async function undeployAccount(metaApiAccountId: string): Promise<void> {
  const token = getToken();

  const res = await fetch(`${PROVISIONING_API}/users/current/accounts/${metaApiAccountId}/undeploy`, {
    method: "POST",
    headers: { "auth-token": token },
  });

  if (!res.ok && res.status !== 409) {
    const text = await res.text();
    throw new Error(`MetaAPI undeploy ${res.status}: ${text.slice(0, 300)}`);
  }
}

/** A single deal from MetaAPI history. */
export interface MetaApiDeal {
  id: string;
  type: string;         // "DEAL_TYPE_BUY" | "DEAL_TYPE_SELL" | "DEAL_TYPE_BALANCE" etc.
  entryType: string;    // "DEAL_ENTRY_IN" | "DEAL_ENTRY_OUT" | "DEAL_ENTRY_INOUT"
  symbol: string;
  profit: number;
  commission: number;
  swap: number;
  volume: number;
  time: string;         // ISO UTC
  positionId: string;   // links IN and OUT deals for the same position
  comment?: string;
}

/** A closed trade reconstructed from paired IN+OUT deals. */
export interface ReconstructedTrade {
  positionId: string;
  symbol: string;
  direction: "buy" | "sell";
  openedAt: string;     // ISO UTC
  closedAt: string;     // ISO UTC
  pnlUsd: number;
  feesUsd: number;
  volume: number;
}

/**
 * Fetches deal history from MetaAPI Trading API.
 * Returns raw deals. Timestamps are already in UTC (ISO 8601).
 * Docs: https://metaapi.cloud/docs/client/restApi/api/retrieveHistoricalData/readDealsByTimeRange/
 */
export async function getDealsHistory(
  metaApiAccountId: string,
  startTime: string,
  endTime: string,
  region?: string
): Promise<MetaApiDeal[]> {
  const token = getToken();

  // Resolve region if not provided
  const accountRegion = region || (await getAccountStatus(metaApiAccountId)).region || "vint-hill";
  const baseUrl = tradingApiUrl(accountRegion);
  const url = `${baseUrl}/users/current/accounts/${metaApiAccountId}/history-deals/time/${encodeURIComponent(startTime)}/${encodeURIComponent(endTime)}`;

  const res = await fetch(url, {
    headers: { "auth-token": token },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`MetaAPI getDeals ${res.status}: ${text.slice(0, 300)}`);
  }

  const body = await res.json();
  // MetaAPI returns an array directly, but handle wrapper object just in case
  if (Array.isArray(body)) return body;
  if (body && Array.isArray(body.deals)) return body.deals;
  return [];
}

/**
 * Fetches closed trades by pairing ENTRY_IN and ENTRY_OUT deals.
 * - ENTRY_OUT deals have the profit, commission, swap.
 * - ENTRY_IN deals have the open time.
 * - They share the same positionId.
 * Timestamps are already UTC (no MT5 offset needed).
 */
export async function getTradeHistory(
  metaApiAccountId: string,
  startTime: string,
  endTime: string,
  region?: string
): Promise<ReconstructedTrade[]> {
  const deals = await getDealsHistory(metaApiAccountId, startTime, endTime, region);

  // Index IN deals by positionId for quick lookup
  const inDeals = new Map<string, MetaApiDeal>();
  const outDeals: MetaApiDeal[] = [];

  for (const deal of deals) {
    // Skip balance operations, credit adjustments, etc.
    if (!deal.symbol || deal.type === "DEAL_TYPE_BALANCE" || deal.type === "DEAL_TYPE_CREDIT") {
      continue;
    }

    if (deal.entryType === "DEAL_ENTRY_IN") {
      inDeals.set(deal.positionId, deal);
    } else if (deal.entryType === "DEAL_ENTRY_OUT" || deal.entryType === "DEAL_ENTRY_INOUT") {
      outDeals.push(deal);
    }
  }

  const trades: ReconstructedTrade[] = [];

  for (const out of outDeals) {
    const inDeal = inDeals.get(out.positionId);
    const openedAt = inDeal?.time || out.time; // fallback to close time if no IN found
    const closedAt = out.time;

    // Determine direction from the OUT deal type
    // When closing a BUY position, the OUT deal is SELL and vice versa
    // So the original position direction is opposite of the OUT deal
    let direction: "buy" | "sell";
    if (out.entryType === "DEAL_ENTRY_INOUT") {
      // Instant trade (open+close in one deal)
      direction = out.type === "DEAL_TYPE_BUY" ? "buy" : "sell";
    } else {
      // Normal close: OUT SELL means original was BUY
      direction = out.type === "DEAL_TYPE_SELL" ? "buy" : "sell";
    }

    trades.push({
      positionId: out.positionId,
      symbol: out.symbol,
      direction,
      openedAt,
      closedAt,
      pnlUsd: out.profit,
      feesUsd: Math.abs(out.commission) + Math.abs(out.swap),
      volume: out.volume,
    });
  }

  return trades;
}

/**
 * Removes a MetaAPI account entirely.
 */
export async function removeAccount(metaApiAccountId: string): Promise<void> {
  const token = getToken();

  // Try to undeploy first
  await undeployAccount(metaApiAccountId).catch(() => {});

  // Wait a bit for undeploy
  await new Promise((r) => setTimeout(r, 2000));

  const res = await fetch(`${PROVISIONING_API}/users/current/accounts/${metaApiAccountId}`, {
    method: "DELETE",
    headers: { "auth-token": token },
  });

  if (!res.ok && res.status !== 404) {
    const text = await res.text();
    throw new Error(`MetaAPI delete ${res.status}: ${text.slice(0, 300)}`);
  }
}
