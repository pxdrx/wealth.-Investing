# MetaAPI Cloud SDK — Research Document

> Package: `metaapi.cloud-sdk` (v29.3.3)
> npm: https://www.npmjs.com/package/metaapi.cloud-sdk
> GitHub: https://github.com/metaapi/metaapi-javascript-sdk
> Docs: https://metaapi.cloud/docs/client/
> Date: 2026-03-30

---

## 1. Installation

```bash
npm install --save metaapi.cloud-sdk
```

ESM import (Node):
```ts
import MetaApi from 'metaapi.cloud-sdk/esm-node';
```

Browser/SPA (React/Next.js):
```ts
import MetaApi, { SynchronizationListener, RiskManagement, EquityBalanceListener } from 'metaapi.cloud-sdk';
```

---

## 2. Account Provisioning

### 2.1 Create a MetaTrader Account Connection

```ts
const api = new MetaApi(token);

const account = await api.metatraderAccountApi.createAccount({
  name: 'Trading account #1',
  type: 'cloud',                        // always 'cloud'
  login: '1234567',                      // MT login number
  platform: 'mt5',                       // 'mt4' | 'mt5'
  password: 'qwerty',                    // can be investor (read-only) password
  server: 'ICMarketsSC-Demo',            // broker server name
  magic: 123456,                         // EA magic number (optional)
  keywords: ['Raw Trading Ltd'],         // helps find server file (optional)
  quoteStreamingIntervalInSeconds: 2.5,  // 0 = tick-by-tick
  reliability: 'high',                   // 'regular' | 'high' (production recommended)
});
```

**Error codes from createAccount:**
- `E_SRV_NOT_FOUND` — server file not found for the given server name
- `E_AUTH` — invalid login/password
- `E_SERVER_TIMEZONE` — failed to detect broker settings (retry later)
- `E_RESOURCE_SLOTS` — resource slots too low

### 2.2 Alternative: Create with Provisioning Profile

If auto-detection fails, create a provisioning profile first:

```ts
const account = await api.metatraderAccountApi.createAccount({
  name: 'Trading account #1',
  type: 'cloud',
  login: '1234567',
  password: 'qwerty',
  server: 'ICMarketsSC-Demo',
  provisioningProfileId: provisioningProfile.id,
  application: 'MetaApi',
  magic: 123456,
  quoteStreamingIntervalInSeconds: 2.5,
  reliability: 'high',
});
```

### 2.3 Get Existing Account

```ts
const account = await api.metatraderAccountApi.getAccount(accountId);
```

### 2.4 Deploy / Undeploy / Redeploy

```ts
await account.deploy();    // start cloud server
await account.undeploy();  // stop cloud server
await account.redeploy();  // restart cloud server
```

### 2.5 Create MT5 Demo Account

```ts
const demoAccount = await api.metatraderAccountGeneratorApi.createMT5DemoAccount({
  accountType: 'type',
  balance: 100000,
  email: 'example@example.com',
  leverage: 100,
  serverName: 'ICMarketsSC-Demo',
  name: 'Test User',
  phone: '+12345678901',
  keywords: ['Raw Trading Ltd'],
});
```

### 2.6 Full Connection Flow

```ts
// 1. Get account
const account = await api.metatraderAccountApi.getAccount(accountId);

// 2. Wait for API server to connect to broker
await account.waitConnected();

// 3a. Get RPC connection (request/response pattern)
const rpcConnection = account.getRPCConnection();
await rpcConnection.connect();
await rpcConnection.waitSynchronized();

// 3b. OR get Streaming connection (real-time updates)
const streamConnection = account.getStreamingConnection();
await streamConnection.connect();
await streamConnection.waitSynchronized();
```

---

## 3. RPC API

### 3.1 getAccountInformation()

```ts
const info = await rpcConnection.getAccountInformation();
```

**Return type: `MetatraderAccountInformation`**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| platform | `'mt4' \| 'mt5'` | Yes | Platform ID |
| broker | string | Yes | Broker name |
| currency | string | Yes | Account base currency |
| server | string | Yes | Broker server name |
| balance | number | Yes | Account balance |
| equity | number | Yes | Account liquidation value |
| margin | number | Yes | Margin used |
| freeMargin | number | Yes | Free margin |
| leverage | number | Yes | Account leverage |
| marginLevel | number | No | Margin level (% equity/margin) |
| tradeAllowed | boolean | Yes | Trading allowed flag |
| investorMode | boolean | No | Investor password used (g2 only) |
| marginMode | `'ACCOUNT_MARGIN_MODE_EXCHANGE' \| 'ACCOUNT_MARGIN_MODE_RETAIL_NETTING' \| 'ACCOUNT_MARGIN_MODE_RETAIL_HEDGING'` | Yes | Margin mode |
| name | string | Yes | Account owner name |
| login | number | Yes | Account login |
| credit | number | Yes | Account credit |
| accountCurrencyExchangeRate | number | No | Exchange rate to base currency |
| type | `'ACCOUNT_TRADE_MODE_DEMO' \| 'ACCOUNT_TRADE_MODE_CONTEST' \| 'ACCOUNT_TRADE_MODE_REAL'` | Yes | Account type |
| currencyDigits | number | Yes | Decimal places for formatting |

**Example response:**
```json
{
  "broker": "True ECN Trading Ltd",
  "currency": "USD",
  "server": "ICMarketsSC-Demo",
  "balance": 7319.9,
  "equity": 7306.65,
  "margin": 184.1,
  "freeMargin": 7120.22,
  "leverage": 100,
  "marginLevel": 3967.58,
  "tradeAllowed": true,
  "marginMode": "ACCOUNT_MARGIN_MODE_RETAIL_HEDGING",
  "name": "Will Turner",
  "login": 367906877,
  "credit": 0,
  "accountCurrencyExchangeRate": 1,
  "type": "ACCOUNT_TRADE_MODE_DEMO",
  "currencyDigits": 2
}
```

### 3.2 getPositions()

```ts
const positions = await rpcConnection.getPositions();
// Returns: MetatraderPosition[]
```

**Return type: `MetatraderPosition`**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | string | Yes | Position ID (ticket) |
| type | `'POSITION_TYPE_BUY' \| 'POSITION_TYPE_SELL'` | Yes | Position type |
| symbol | string | Yes | Symbol |
| magic | number | Yes | EA magic number |
| time | string (ISO datetime) | Yes | Open time |
| brokerTime | string | Yes | Open time in broker TZ (`YYYY-MM-DD HH:mm:ss.SSS`) |
| updateTime | string (ISO datetime) | Yes | Last modification time |
| openPrice | number | Yes | Open price |
| currentPrice | number | Yes | Current price |
| currentTickValue | number | Yes | Current tick value |
| stopLoss | number | No | Stop loss price |
| takeProfit | number | No | Take profit price |
| volume | number | Yes | Volume (lots) |
| profit | number | Yes | Cumulative P&L (incl. swap/commission for closed part) |
| realizedProfit | number | Yes | Closed part profit |
| unrealizedProfit | number | Yes | Open part profit (excl. swap/commission) |
| commission | number | Yes | Total commissions |
| realizedCommission | number | Yes | Commission from closed part |
| unrealizedCommission | number | Yes | Commission from open part |
| swap | number | Yes | Cumulative swap |
| realizedSwap | number | Yes | Swap from closed part |
| unrealizedSwap | number | Yes | Swap from open part |
| accountCurrencyExchangeRate | number | No | Exchange rate to base currency |
| comment | string | No | Position comment |
| clientId | string | No | Client-assigned ID |
| reason | string | Yes | Position open reason (`POSITION_REASON_CLIENT`, `POSITION_REASON_EXPERT`, `POSITION_REASON_MOBILE`, `POSITION_REASON_WEB`, `POSITION_REASON_UNKNOWN`) |
| brokerComment | string | No | Broker comment |

### 3.3 Other RPC Methods

```ts
// Single position/order
await connection.getPosition('1234567');
await connection.getOrder('1234567');
await connection.getOrders();

// History
await connection.getHistoryOrdersByTicket('1234567');
await connection.getHistoryOrdersByPosition('1234567');
await connection.getHistoryOrdersByTimeRange(startTime, endTime);
await connection.getDealsByTicket('1234567');
await connection.getDealsByPosition('1234567');
await connection.getDealsByTimeRange(startTime, endTime);

// Server time
await connection.getServerTime();

// Margin calculation
await connection.calculateMargin({
  symbol: 'GBPUSD',
  type: 'ORDER_TYPE_BUY',
  volume: 0.1,
  openPrice: 1.1,
});

// Trading
await connection.createLimitBuyOrder('GBPUSD', 0.07, 1.0, 0.9, 2.0, {
  comment: 'comm',
  clientId: 'TE_GBPUSD_7hyINWqAlE',
  expiration: {
    type: 'ORDER_TIME_SPECIFIED',
    time: new Date(Date.now() + 24 * 60 * 60 * 1000),
  },
});
```

---

## 4. Streaming / WebSocket API

### 4.1 StreamingConnection Setup

```ts
const account = await api.metatraderAccountApi.getAccount(accountId);
await account.waitConnected();

const connection = account.getStreamingConnection();
await connection.connect();
await connection.waitSynchronized();
```

### 4.2 Terminal State (Local Cache)

After synchronization, `terminalState` holds a local mirror updated in real-time:

```ts
const terminalState = connection.terminalState;

terminalState.connected;              // boolean — connected to MetaApi
terminalState.connectedToBroker;      // boolean — connected to broker
terminalState.accountInformation;     // MetatraderAccountInformation
terminalState.positions;              // MetatraderPosition[]
terminalState.orders;                 // MetatraderOrder[]
terminalState.specifications;         // symbol specs
terminalState.specification('EURUSD'); // single spec
terminalState.price('EURUSD');        // current price
```

### 4.3 History Storage

```ts
const historyStorage = connection.historyStorage;

historyStorage.orderSynchronizationFinished; // boolean
historyStorage.dealSynchronizationFinished;  // boolean

historyStorage.deals;                              // all deals
historyStorage.dealsByTicket(1);                    // by ticket
historyStorage.dealsByPosition(1);                  // by position
historyStorage.dealsByTimeRange(startDate, endDate); // by time range

historyStorage.historyOrders;                              // all orders
historyStorage.historyOrdersByTicket(1);                    // by ticket
historyStorage.historyOrdersByPosition(1);                  // by position
historyStorage.historyOrdersByTimeRange(startDate, endDate); // by time range
```

### 4.4 SynchronizationListener

```ts
import { SynchronizationListener } from 'metaapi.cloud-sdk';

class MySynchronizationListener extends SynchronizationListener {
  // Override any of these methods:

  async onAccountInformationUpdated(
    instanceIndex: string,
    accountInformation: MetatraderAccountInformation
  ): Promise<void> {}

  async onPositionUpdated(
    instanceIndex: string,
    position: MetatraderPosition
  ): Promise<void> {}

  async onPositionRemoved(
    instanceIndex: string,
    positionId: string
  ): Promise<void> {}

  async onOrderUpdated(
    instanceIndex: string,
    order: MetatraderOrder
  ): Promise<void> {}

  async onOrderCompleted(
    instanceIndex: string,
    orderId: string
  ): Promise<void> {}

  async onDealAdded(
    instanceIndex: string,
    deal: MetatraderDeal
  ): Promise<void> {}

  async onSymbolPriceUpdated(
    instanceIndex: string,
    price: MetatraderSymbolPrice
  ): Promise<void> {}

  async onConnected(
    instanceIndex: string,
    replicas: number
  ): Promise<void> {}

  async onDisconnected(
    instanceIndex: string
  ): Promise<void> {}

  async onBrokerConnectionStatusChanged(
    instanceIndex: string,
    connected: boolean
  ): Promise<void> {}
}

// Usage:
const listener = new MySynchronizationListener();
connection.addSynchronizationListener(listener);

// Add listener BEFORE connecting
await connection.connect();

// Remove when done
connection.removeSynchronizationListener(listener);
```

### 4.5 Equity/Balance Real-Time Streaming (Risk Management API)

```ts
import { RiskManagement, EquityBalanceListener } from 'metaapi.cloud-sdk';

class MyEquityBalanceListener extends EquityBalanceListener {
  async onEquityOrBalanceUpdated(equityBalanceData: {
    equity: number;
    balance: number;
  }): Promise<void> {
    console.log('Equity/Balance update:', equityBalanceData);
  }

  async onConnected(): Promise<void> {
    console.log('Connected');
  }

  async onDisconnected(): Promise<void> {
    console.log('Disconnected');
  }

  async onError(error: Error): Promise<void> {
    console.error('Error:', error);
  }
}

const riskManagement = new RiskManagement(token);
const riskManagementApi = riskManagement.riskManagementApi;

const listener = new MyEquityBalanceListener(accountId);
const listenerId = riskManagementApi.addEquityBalanceListener(listener, accountId);

// Later, to stop:
riskManagementApi.removeEquityBalanceListener(listenerId);
```

---

## 5. Authentication & Token Management

### 5.1 Token Types

1. **API Access Token** — master token from https://app.metaapi.cloud/api-access/generate-token
   - Full access to all your accounts
   - Use on server-side (API routes) only
   - NEVER expose to browser

2. **Scoped/Narrowed Token** — generated via `tokenManagementApi.narrowDownToken()`
   - Limited by: applications, roles, resources, validity period
   - Safe for browser usage

### 5.2 Creating a Scoped Token (for Browser)

```ts
const accountId = '...';
const validityInHours = 24;

const scopedToken = await api.tokenManagementApi.narrowDownToken(
  {
    applications: [
      'metaapi-rest-api',
      'metaapi-rpc-api',
      'metaapi-real-time-streaming-api',
    ],
    roles: ['reader'],  // read-only access
    resources: [
      { entity: 'account', id: accountId },
    ],
  },
  validityInHours
);

// scopedToken is a string JWT — send to browser
```

**Available applications:**
- `trading-account-management-api`
- `copyfactory-api`
- `metaapi-rest-api`
- `metaapi-rpc-api`
- `metaapi-real-time-streaming-api`
- `metastats-api`
- `risk-management-api`

**Available roles:**
- `reader` — read-only
- `admin` — full access (trading, config changes)

### 5.3 Architecture for Next.js

```
Browser (client component)
  └─ Uses SCOPED token (reader, single account, 24h expiry)
  └─ MetaApi SDK streaming connection
  └─ terminalState for real-time data

API Route (server)
  └─ Uses MASTER token (env var METAAPI_TOKEN)
  └─ Creates accounts, generates scoped tokens
  └─ Never exposed to client
```

---

## 6. TypeScript Types Summary

```ts
// Core entry point
import MetaApi, {
  SynchronizationListener,
  RiskManagement,
  EquityBalanceListener,
} from 'metaapi.cloud-sdk';

// Instantiation
const api = new MetaApi(token: string);

// Key classes
api.metatraderAccountApi         // Account management
api.metatraderAccountGeneratorApi // Demo account creation
api.tokenManagementApi           // Token narrowing

// Account object
const account = await api.metatraderAccountApi.getAccount(id: string);
account.waitConnected(): Promise<void>
account.getRPCConnection(): RpcMetaApiConnection
account.getStreamingConnection(): StreamingMetaApiConnection
account.deploy(): Promise<void>
account.undeploy(): Promise<void>
account.redeploy(): Promise<void>

// RPC Connection
rpcConnection.connect(): Promise<void>
rpcConnection.waitSynchronized(): Promise<void>
rpcConnection.getAccountInformation(): Promise<MetatraderAccountInformation>
rpcConnection.getPositions(): Promise<MetatraderPosition[]>
rpcConnection.getPosition(id: string): Promise<MetatraderPosition>
rpcConnection.getOrders(): Promise<MetatraderOrder[]>
rpcConnection.getOrder(id: string): Promise<MetatraderOrder>
rpcConnection.getHistoryOrdersByTicket(ticket: string): Promise<MetatraderHistoryOrders>
rpcConnection.getHistoryOrdersByPosition(positionId: string): Promise<MetatraderHistoryOrders>
rpcConnection.getHistoryOrdersByTimeRange(start: Date, end: Date): Promise<MetatraderHistoryOrders>
rpcConnection.getDealsByTicket(ticket: string): Promise<MetatraderDeals>
rpcConnection.getDealsByPosition(positionId: string): Promise<MetatraderDeals>
rpcConnection.getDealsByTimeRange(start: Date, end: Date): Promise<MetatraderDeals>
rpcConnection.getServerTime(): Promise<ServerTime>
rpcConnection.calculateMargin(order: MarginOrder): Promise<Margin>

// Streaming Connection
streamConnection.connect(): Promise<void>
streamConnection.waitSynchronized(): Promise<void>
streamConnection.terminalState: TerminalState
streamConnection.historyStorage: HistoryStorage
streamConnection.addSynchronizationListener(listener: SynchronizationListener): void
streamConnection.removeSynchronizationListener(listener: SynchronizationListener): void
```

---

## 7. Key Considerations for Production

1. **Reliability:** Set `reliability: 'high'` on account creation for production
2. **Quote interval:** Set `quoteStreamingIntervalInSeconds: 0` for tick-by-tick data
3. **Investor password:** Use investor (read-only) password if you only need monitoring
4. **Connection time:** `waitConnected()` can take minutes on first connection to broker
5. **Synchronization time:** `waitSynchronized()` depends on account history size
6. **Browser safety:** Always use narrowed tokens in browser, never the master token
7. **Pricing:** MetaAPI is a paid service — check https://metaapi.cloud/#pricing
8. **React integration guide:** https://github.com/metaapi/metaapi-javascript-sdk/blob/master/docs/ui/react.md
