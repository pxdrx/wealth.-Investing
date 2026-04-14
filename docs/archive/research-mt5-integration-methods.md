# Research: MT5 Real-Time Integration Methods for Web Applications

**Date:** 2026-03-30
**Context:** wealth.Investing trading dashboard (Next.js 14, Supabase, Vercel)
**Goal:** Automate real-time account monitoring, trade sync, drawdown tracking

---

## Executive Summary

There is **no official REST/WebSocket API from MetaQuotes for retail traders**. The MT5 ecosystem requires intermediary solutions. The industry-standard approach used by TradeZella, TradesViz, and prop firms is **investor-password-based sync via cloud services like MetaAPI**. For our Next.js + Vercel stack, **MetaAPI (metaapi.cloud)** is the clear winner — it provides a Node.js SDK, REST + WebSocket APIs, and runs entirely in the cloud with no desktop bridge needed.

---

## A) MT5 Official APIs (MetaQuotes)

### Manager API (Server-side)
- **Who can use it:** Only licensed brokers/white-label partners with a MetaTrader 5 server license
- **What it does:** 98+ REST endpoints for account management, financial operations, risk controls, reporting
- **Architecture:** Direct server-to-server REST API over HTTPS
- **Auth:** API key/token issued by MetaQuotes to licensees
- **Cost:** Included with MT5 server license (expensive — institutional only)
- **Latency:** Low (direct server connection)
- **Limitations:** NOT available to retail traders or third-party app developers. You must be a broker.
- **Web server compatible:** Yes (REST), but irrelevant since we can't access it

### Web API (Broker Portal)
- **Who can use it:** Brokers building their own trader portals
- **What it does:** REST API for quote broadcasting, trader portal integration
- **Architecture:** Standard HTTP GET/POST over HTTPS
- **Limitations:** Same as Manager API — broker-only access

### MQL5 Integration (Expert Advisors)
- **What it does:** Run custom scripts inside MT5 terminal
- **Architecture:** Runs on the MT5 desktop client, can send HTTP requests to external servers
- **Auth:** N/A (runs locally)
- **Cost:** Free
- **Latency:** Real-time (runs inside the terminal)
- **Limitations:** Requires MT5 desktop running 24/7, user must install EA, fragile
- **Web server compatible:** No — requires desktop bridge (EA sends data to your API)

**Verdict:** Official APIs are broker-only. For retail/prop traders, MQL5 EA is an option but requires desktop running 24/7.

---

## B) MetaTrader5 Python Package (PyPI)

### How it works
- Official Python package by MetaQuotes: `pip install MetaTrader5`
- Connects to a locally running MT5 terminal via IPC
- Full read/write access: account info, positions, orders, history, market data

### Architecture
```
[MT5 Desktop Terminal] <--IPC--> [Python Script] <--HTTP--> [Your Web Server]
```

### Critical Limitations
- **Windows ONLY** — the package uses Windows COM/DLL interop
- Requires MT5 desktop terminal running on the same Windows machine
- Cannot run on Linux, macOS, Docker, or any cloud server (Vercel, AWS Lambda, etc.)
- Cannot run in a Next.js API route

### Bridge/Microservice Solutions
| Package | Approach | Platform Support |
|---------|----------|-----------------|
| `mt5-remote` | RPyC server on Windows, client from anywhere | Linux/macOS client → Windows server |
| `mt5linux` | Wine + RPyC on Linux | Linux (via Wine) |
| `mt5-server` | RPyC bridge | Linux client → Windows server |

### Cost
- Free (open source)
- But requires a Windows VPS running 24/7 (~$10-30/month)

### Auth
- MT5 account credentials (login + password or investor password)

### Latency
- Real-time locally, but adds network hop for remote bridge (~50-200ms)

**Verdict:** Viable as a self-hosted bridge on a Windows VPS, but adds operational complexity. Not compatible with serverless (Vercel).

---

## C) MetaAPI (metaapi.cloud) — RECOMMENDED

### How it works
MetaAPI runs MT5 terminals in their cloud infrastructure. You provide your MT5 account credentials (investor password for read-only), and they maintain the connection 24/7. You interact via REST API and WebSocket.

### Architecture
```
[Your Next.js App] <--REST/WS--> [MetaAPI Cloud] <--MT5 Protocol--> [Broker MT5 Server]
```

### Features
- **Account data:** Balance, equity, margin, free margin, profit
- **Open positions:** Real-time tracking with P&L
- **Trade history:** Full history sync with pagination
- **Market data:** Real-time prices, Level 2 depth
- **Risk management API:** Drawdown tracking, daily loss limits, max position rules
- **MetaStats API:** Pre-calculated trading metrics (Sharpe, Sortino, win rate, etc.)
- **CopyFactory:** Trade copying between accounts
- **Manager API:** For prop firms — manage accounts programmatically

### SDKs
- **Node.js SDK:** `metaapi.cloud-sdk` (npm) — perfect for Next.js API routes
- **Python SDK:** `metaapi-cloud-sdk` (PyPI)
- **Java SDK:** Available on GitHub

### Pricing (estimated from public info)
- **Free tier:** Limited number of accounts (likely 1-2), basic features
- **Paid tiers:** Per-account monthly fee for cloud terminal hosting
- MetaStats included at no extra charge
- Risk management API available
- Exact pricing requires contacting sales or checking metaapi.cloud/#pricing

### Auth
- MetaAPI auth token (JWT) for API access
- MT5 investor password for read-only account connection
- MT5 full password for trade execution

### Latency
- REST: ~100-500ms per request
- WebSocket: Real-time streaming (sub-second updates)
- Synchronization modes: `automatic` (RPC) or `user` (real-time state tracking)

### Limitations
- Third-party dependency (vendor lock-in risk)
- Monthly cost per account
- Rate limits on API calls
- Not self-hosted (data goes through their cloud)

### Next.js Integration Example
```typescript
// In a Next.js API route
import MetaApi from 'metaapi.cloud-sdk';

const api = new MetaApi('your-auth-token');
const account = await api.metatraderAccountApi.getAccount('accountId');
await account.waitConnected();

// Get real-time account info
const connection = account.getRPCConnection();
await connection.connect();
await connection.waitSynchronized();

const info = await connection.getAccountInformation();
// { balance: 100000, equity: 100250, margin: 1200, freeMargin: 99050, ... }

const positions = await connection.getPositions();
// [{ symbol: 'EURUSD', type: 'buy', volume: 0.5, profit: 250, ... }]

const history = await connection.getHistoryOrdersByTimeRange(startDate, endDate);
```

**Verdict:** Best option for our stack. Cloud-native, Node.js SDK, no desktop needed, supports Vercel deployment. Industry standard used by trading journal platforms.

---

## D) cTrader Open API — Comparison

### How it works
cTrader provides a first-party Open API with WebSocket (TCP+SSL or WS) and REST endpoints. Far more developer-friendly than MT5.

### Architecture
```
[Your Web App] <--WebSocket/REST--> [cTrader Backend (Spotware)]
```

### Features
- Full account data, positions, orders, history
- Real-time streaming via WebSocket
- OAuth2 authentication
- JSON or Protobuf serialization
- REST API for account management

### Cost
- **Free** — no per-account fees
- Requires cTrader ID (cTID)

### Auth
- OAuth2 (standard web auth flow)

### Latency
- Real-time via WebSocket

### Limitations
- Only works with cTrader accounts (not MT5)
- Fewer brokers support cTrader vs MT5
- Need to register an application with Spotware

**Verdict:** Superior developer experience vs MT5. If we add cTrader support, this is straightforward. But most prop firms use MT5, so this is secondary.

---

## E) Third-Party Services Comparison

### 1. Myfxbook API (v1.38, Oct 2025)
| Aspect | Detail |
|--------|--------|
| Architecture | REST API, read personal account data |
| Auth | Session token via login endpoint |
| Cost | Free |
| Latency | Polling only (not real-time) |
| Limitations | Personal data only, no trade execution, limited endpoints |
| Web compatible | Yes (REST) |
| Use case | Display verified trade statistics |

### 2. FX Blue
| Aspect | Detail |
|--------|--------|
| Architecture | HTML+JS App API, runs inside broker platforms |
| Auth | App-level integration |
| Cost | Free for basic |
| Limitations | Designed for in-platform apps, not external REST API |
| Web compatible | Limited |
| Use case | White-label analytics widgets |

### 3. MTsocketAPI
| Aspect | Detail |
|--------|--------|
| Architecture | REST + JSON bridge to MT4/MT5 |
| Auth | MT5 credentials |
| Cost | Paid license |
| Latency | Low latency (runs alongside MT5) |
| Limitations | Requires MT5 desktop + bridge running |
| Web compatible | Yes (REST), but needs desktop component |
| Use case | Low-latency algo trading |

### 4. DXtrade API
| Aspect | Detail |
|--------|--------|
| Architecture | REST API + Push API (WebSocket) |
| Auth | API credentials |
| Cost | Platform license (broker-level) |
| Limitations | Only DXtrade accounts |
| Web compatible | Yes |
| Use case | Brokers building on DXtrade platform |

### 5. Match-Trader API
| Aspect | Detail |
|--------|--------|
| Architecture | RESTful API, standard HTTP methods |
| Auth | API key |
| Cost | Platform license |
| Limitations | Only Match-Trader platform accounts |
| Web compatible | Yes |
| Use case | Match-Trader ecosystem integrations |

---

## F) FIX Protocol

### How it works
FIX (Financial Information eXchange) is a standard protocol for electronic trading. Some forex brokers offer FIX API access.

### Architecture
```
[Your Server] <--FIX 4.4/5.0--> [Broker FIX Engine]
```

### Cost
- Usually requires high minimum deposit ($10k-$50k+)
- Some brokers charge monthly fees

### Auth
- SenderCompID/TargetCompID + credentials

### Latency
- Lowest possible — direct exchange connection

### Limitations
- **Not designed for web apps** — requires persistent TCP connection
- Complex protocol (not REST/JSON)
- Most brokers restrict to institutional/high-volume clients
- Requires dedicated server (not serverless)
- Overkill for journal/dashboard use case

### Brokers offering FIX + MT5
- FXPIG, Capital.com, some institutional brokers

**Verdict:** Irrelevant for our use case. FIX is for institutional algo trading, not web dashboards.

---

## G) Prop Firm Integration Methods

### How FTMO, The5ers, etc. track accounts

1. **FTMO Technical Infrastructure:**
   - Runs custom MT5 servers ("FTMO Server")
   - Uses Manager API (as MT5 server licensee) to monitor all trader accounts
   - Real-time drawdown tracking, daily loss limits enforced server-side
   - Dashboard pulls data from their own backend (not external APIs)

2. **The5ers:**
   - Direct integrations with institutional brokers
   - Similar server-side monitoring via Manager API

3. **General Pattern:**
   - Prop firms ARE brokers (or white-label partners) — they have Manager API access
   - They don't use third-party APIs to monitor their own accounts
   - Their dashboards are built on their own infrastructure

### Do prop firms offer APIs for traders?
- **No public developer APIs** from FTMO, The5ers, or major prop firms
- Traders can only view their data via the prop firm's web dashboard
- Some firms allow Myfxbook/FX Blue integration for verified stats
- MetaAPI can connect to prop firm MT5 accounts using investor password

**Verdict:** Prop firms use Manager API internally. For external monitoring, MetaAPI with investor password is the standard approach.

---

## H) Competitor Analysis — How Trading Journals Integrate MT5

### TradesViz (tradesviz.com)
- **Method:** Runs custom MT5 clients on their own servers using investor password
- **Architecture:** Cloud-hosted MT5 terminals, 24/7 sync
- **User experience:** Enter MT5 login + investor password → auto-sync
- **Fallback:** CSV/file upload from MT5 History tab

### TradeZella (tradezella.com)
- **Method:** Broker Sync (MetaAPI-like) + File Upload
- **Architecture:** User provides MT5 login + investor password
- **Autosync:** Real-time for supported brokers
- **Fallback:** Export from MT5 Terminal > History tab

### Edgewonk
- **Method:** Direct integration with MT4/MT5/cTrader
- **Architecture:** Likely uses investor password sync or file import
- **Fallback:** CSV import

### Tradervue
- **Method:** File upload + select broker auto-import
- **Architecture:** CSV/file-based primarily
- **Fallback:** Manual entry

### Common Pattern
All major trading journals use one or more of:
1. **Investor password sync** (via MetaAPI or custom MT5 cloud terminals) — preferred
2. **File upload** (CSV/HTML export from MT5) — universal fallback
3. **Manual entry** — last resort

---

## Recommendation for wealth.Investing

### Phase 1: File Import (CURRENT — already built)
- MT5 HTML/XLSX report parsing via `/api/journal/import-mt5`
- Works for all brokers, no dependencies
- Manual process (user exports → uploads)

### Phase 2: MetaAPI Integration (RECOMMENDED NEXT STEP)
- **Service:** MetaAPI (metaapi.cloud)
- **SDK:** `metaapi.cloud-sdk` (npm)
- **Auth flow:** User enters MT5 login + investor password in dashboard
- **Features to implement:**
  1. Real-time balance/equity tracking
  2. Automatic trade history sync (polling every 1-5 min via cron or WebSocket)
  3. Open positions monitoring
  4. Real-time drawdown calculation using MetaAPI Risk Management API
  5. MetaStats for pre-built trading metrics

### Architecture for Phase 2
```
┌─────────────────────┐
│  wealth.Investing   │
│  (Next.js on Vercel)│
├─────────────────────┤
│ API Routes:         │
│ /api/mt5/connect    │──── Store encrypted MT5 creds in Supabase
│ /api/mt5/sync       │──── Fetch trades from MetaAPI → upsert journal_trades
│ /api/mt5/positions  │──── Get open positions (real-time)
│ /api/mt5/equity     │──── Get balance/equity/drawdown
│ /api/mt5/stats      │──── Get MetaStats metrics
└─────────┬───────────┘
          │ REST / WebSocket
          ▼
┌─────────────────────┐
│  MetaAPI Cloud      │
│  (metaapi.cloud)    │
├─────────────────────┤
│ MT5 Cloud Terminal  │──── Connected 24/7 via investor password
│ MetaStats API       │──── Pre-calculated metrics
│ Risk Management API │──── Drawdown tracking
└─────────┬───────────┘
          │ MT5 Protocol
          ▼
┌─────────────────────┐
│  Broker MT5 Server  │
│  (FTMO, The5ers,    │
│   any MT5 broker)   │
└─────────────────────┘
```

### Phase 3: cTrader Open API (FUTURE)
- Direct WebSocket integration (free, no intermediary)
- OAuth2 authentication
- Real-time streaming

### Cost Estimate
- MetaAPI: ~$5-15/account/month (estimate, check current pricing)
- Can be part of Pro tier features to offset cost
- Free tier may cover 1-2 accounts for testing

### Implementation Priority
1. MetaAPI account setup + SDK integration
2. Connect flow (UI for entering MT5 credentials)
3. Trade history auto-sync (replace manual import)
4. Real-time equity/drawdown monitoring
5. Open positions dashboard widget
6. MetaStats integration for advanced metrics

---

## Sources

- [MetaAPI Cloud — Official Site](https://metaapi.cloud/)
- [MetaAPI Node.js SDK (npm)](https://www.npmjs.com/package/metaapi.cloud-sdk)
- [MetaAPI Risk Management API](https://metaapi.cloud/docs/risk-management/)
- [MetaAPI MetaStats API](https://metaapi.cloud/docs/metastats/)
- [MetaAPI Manager API](https://metaapi.cloud/docs/manager/)
- [MetaTrader5 Python Package (PyPI)](https://pypi.org/project/metatrader5/)
- [MQL5 Python Integration Docs](https://www.mql5.com/en/docs/python_metatrader5)
- [mt5-remote (PyPI)](https://pypi.org/project/mt5-remote/)
- [cTrader Open API](https://help.ctrader.com/open-api/)
- [cTrader WebServices API](https://www.spotware.com/ctrader/dev-resources/web-services-api/)
- [Myfxbook API](https://www.myfxbook.com/api)
- [FX Blue App API](https://www.fxbluelabs.com/app-api)
- [DXtrade APIs](https://dx.trade/apis/)
- [Match-Trader API](https://match-trader.com/technology/platform-api/)
- [MTsocketAPI](https://www.mtsocketapi.com/)
- [How Trading Journals Sync Trades (VikoFintech)](https://vikofintech.com/en/posts/broker-trade-sync-mt5-ctrader-tradovate-integration/)
- [TradesViz MT5 Auto-Import](https://www.tradesviz.com/blog/auto-import-mt5fa/)
- [TradeZella MT5 Integration](https://www.tradezella.com/integrations/metatrader-5)
- [Edgewonk Supported Platforms](https://edgewonk.com/import)
- [FTMO Technical Infrastructure](https://ftmo.com/en/faq/how-does-the-ftmo-technical-infrastructure-work/)
- [B2Broker — Web API for MetaTrader](https://b2broker.com/news/web-api-for-metatrader-how-does-it-work/)
- [Forex Brokers with FIX API](https://fx-list.com/forex-brokers-fix-api)
