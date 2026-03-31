// MetaAPI SDK uses `window` at import time, so we must lazy-import it
// to avoid breaking Next.js server-side builds.

let _metaApi: any = null;

async function getMetaApi() {
  if (!_metaApi) {
    const token = process.env.METAAPI_TOKEN;
    if (!token) throw new Error("METAAPI_TOKEN not configured");
    // Use the CJS/Node build to avoid "window is not defined" in serverless
    const { default: MetaApi } = await import("metaapi.cloud-sdk/node");
    _metaApi = new MetaApi(token);
  }
  return _metaApi;
}

export interface ProvisionResult {
  metaApiAccountId: string;
  state: string;
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
 * Provisions a new MetaAPI cloud account for MT5 monitoring (investor/read-only).
 */
export async function provisionAccount(
  login: string,
  investorPassword: string,
  server: string,
  accountName: string,
  platform: "mt4" | "mt5" = "mt5"
): Promise<ProvisionResult> {
  const api = await getMetaApi();

  const account = await api.metatraderAccountApi.createAccount({
    name: accountName,
    login,
    password: investorPassword,
    server,
    platform,
    type: "cloud-g2",
    magic: 0,
    manualTrades: true,
    quoteStreamingIntervalInSeconds: 2.5,
  });

  return {
    metaApiAccountId: account.id,
    state: account.state,
  };
}

/**
 * Deploys a MetaAPI cloud account (starts the cloud terminal).
 * Waits up to 5 minutes for the account to connect.
 */
export async function deployAndWait(metaApiAccountId: string): Promise<void> {
  const api = await getMetaApi();
  const account = await api.metatraderAccountApi.getAccount(metaApiAccountId);

  if (account.state !== "DEPLOYED") {
    await account.deploy();
  }

  await account.waitConnected(undefined, 300);
}

/**
 * Undeploys a MetaAPI cloud account (stops the cloud terminal to save costs).
 */
export async function undeployAccount(metaApiAccountId: string): Promise<void> {
  const api = await getMetaApi();
  const account = await api.metatraderAccountApi.getAccount(metaApiAccountId);

  if (account.state === "DEPLOYED") {
    await account.undeploy();
  }
}

/**
 * Removes a MetaAPI cloud account entirely.
 */
export async function removeAccount(metaApiAccountId: string): Promise<void> {
  const api = await getMetaApi();
  const account = await api.metatraderAccountApi.getAccount(metaApiAccountId);

  if (account.state === "DEPLOYED") {
    await account.undeploy();
    await account.waitUndeployed(undefined, 60);
  }

  await account.remove();
}

/**
 * Gets current account information (balance, equity, margin) via RPC.
 */
export async function getAccountInfo(metaApiAccountId: string): Promise<AccountSnapshot> {
  const api = await getMetaApi();
  const account = await api.metatraderAccountApi.getAccount(metaApiAccountId);
  const connection = account.getRPCConnection();

  await connection.connect();
  await connection.waitSynchronized();

  const info = await connection.getAccountInformation();

  return {
    equity: info.equity,
    balance: info.balance,
    margin: info.margin,
    freeMargin: info.freeMargin,
    currency: info.currency,
    broker: info.broker,
    leverage: info.leverage,
    investorMode: info.investorMode ?? false,
  };
}

/**
 * Gets current open positions via RPC.
 */
export async function getPositions(metaApiAccountId: string): Promise<LivePosition[]> {
  const api = await getMetaApi();
  const account = await api.metatraderAccountApi.getAccount(metaApiAccountId);
  const connection = account.getRPCConnection();

  await connection.connect();
  await connection.waitSynchronized();

  const positions = await connection.getPositions();

    return positions.map((p: any) => ({
    id: String(p.id),
    symbol: p.symbol,
    type: p.type,
    volume: p.volume,
    openPrice: p.openPrice,
    currentPrice: p.currentPrice,
    profit: p.profit,
    swap: p.swap ?? 0,
    commission: p.commission ?? 0,
    stopLoss: p.stopLoss ?? null,
    takeProfit: p.takeProfit ?? null,
    openTime: String(p.time),
    comment: p.comment ?? "",
    magic: p.magic ?? 0,
  }));
}

/**
 * Gets the connection status of a MetaAPI account.
 */
export async function getConnectionStatus(metaApiAccountId: string): Promise<{
  state: string;
  connectionStatus: string;
}> {
  const api = await getMetaApi();
  const account = await api.metatraderAccountApi.getAccount(metaApiAccountId);

  return {
    state: account.state,
    connectionStatus: account.connectionStatus,
  };
}
