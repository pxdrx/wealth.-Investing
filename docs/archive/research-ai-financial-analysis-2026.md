# AI Financial Analysis Systems Research — March 2026

## Executive Summary

**Recommendation:** Keep Dexter for stock fundamental analysis (it excels there), but **do NOT rely on it for forex/crypto/commodities** — it has zero coverage for those asset classes. For wealth.Investing's use case (BR traders, forex/crypto/commodities focus), build a custom solution combining multiple data APIs + Claude/GPT for analysis.

---

## 1. Open-Source AI Financial Agents

### virattt/dexter (what we have)
- **Stars:** High-profile project by Virat Singh (ex-fintech)
- **Stack:** TypeScript, Bun, LangChain, Ink CLI
- **LLM Support:** OpenAI (default GPT-5.4), Anthropic, Google, xAI, Ollama
- **Data Source:** Financial Datasets API (financialdatasets.ai) — US stocks only
- **Capabilities:**
  - Income statements, balance sheets, cash flow
  - SEC filings (10-K, 10-Q, 8-K)
  - Insider trades, earnings, estimates, key ratios
  - DCF valuation skill
  - Stock screening
  - Crypto module exists (`crypto.ts`) — needs investigation
  - Web search via Exa/Tavily
  - Self-validation loop (plans → executes → validates)
- **Strengths:** Excellent architecture, self-validating agent loop, scratchpad debugging, WhatsApp gateway, eval suite
- **Weaknesses:**
  - **US stocks only** — no forex, no commodities, limited crypto
  - Financial Datasets API is niche, not well-documented publicly
  - No technical analysis (no indicators, no charting)
  - No sentiment analysis beyond news search
  - CLI-only (no web UI, no API server)

### Notable Competitors on GitHub

| Project | Description | Stars | Strength | Weakness |
|---------|-------------|-------|----------|----------|
| **virattt/ai-hedge-fund** | Dexter's predecessor, multi-agent hedge fund sim | Very high (many forks) | Multi-agent debate, portfolio management | Python, older architecture |
| **TradingGoose** | Multi-agent LLM trading framework | Small | Portfolio mgmt + stock analysis | Early stage |
| **Agentic-Analyst/stock-analyst** (VYNN) | Agent backend for financial reports | Active | Modular, generates PDF reports | Stocks only |
| **stock-assist** | Production Flask app (served 46 users) | Small | Full SaaS with payments | Python, stocks only |
| **AI-Investment-Research-Agent** | DeepSeek-based report generator | Small | LaTeX/PDF reports, 3-min analysis | Stocks only |
| **skopaqtrader** | Indian equities AI trading platform | New | Multi-agent, broker integration | India-specific |

**Verdict:** Dexter is the **best open-source financial research agent** available. No competitor matches its architecture quality, multi-LLM support, and self-validation. However, ALL open-source options are stock-focused — none handle forex/crypto/commodities well.

---

## 2. Commercial AI Analysis Platforms

| Platform | Focus | AI Features | Asset Coverage | Pricing | API | Real-time |
|----------|-------|-------------|----------------|---------|-----|-----------|
| **FinChat.io** | Conversational research | AI chat over S&P data, earnings transcripts | 100K+ companies (stocks) | $29/mo (Plus) | No public API | Near real-time |
| **Koyfin** | Financial visualization | AI charting, dashboards | Stocks, ETFs, bonds, FX, commodities, macro | $0-299/mo | No public API | Yes |
| **Seeking Alpha** | Crowd-sourced analysis | Alpha Picks (+93% avg return) | US stocks | $99/yr (Premium) | No | Delayed |
| **TipRanks** | Analyst tracking | Analyst accuracy scoring | Stocks | $99/yr | Limited | Near real-time |
| **Simply Wall St** | Visual analysis | Automated valuations, snowflake scores | Global stocks | $120/yr | No | Daily updates |
| **Morningstar** | Fundamental research | Proprietary ratings, fair value | Stocks, funds, ETFs | $249/yr | Morningstar API (enterprise) | Delayed |
| **Bloomberg Terminal** | Everything | Full suite | All asset classes | ~$24K/yr | Bloomberg API | Real-time |

### Key Insights
- **FinChat** = best value for AI-powered stock research ($29/mo vs Bloomberg $2K/mo)
- **Koyfin** = only commercial platform covering multi-asset including FX and commodities at affordable price
- **Seeking Alpha** Alpha Picks = best documented track record (93% avg return, 68% beat S&P)
- **Simply Wall St** = best for international stocks, visual analysis
- **None offer APIs suitable for integration** into our dashboard (except Bloomberg at enterprise pricing)

---

## 3. Financial Data APIs

| API | Stocks | Forex | Crypto | Commodities | Free Tier | Paid From | Real-time | Best For |
|-----|--------|-------|--------|-------------|-----------|-----------|-----------|----------|
| **Financial Modeling Prep** | Yes (30yr+) | Yes | Yes | Yes | Limited | $19/mo | Yes (WebSocket) | All-in-one, best value |
| **Polygon.io** | Yes | Yes | Yes | No | 5 calls/min | $199/mo (stocks), separate for FX/crypto | Yes (tick-level) | Algo trading, speed |
| **Alpha Vantage** | Yes | Yes | Yes | Commodities | 25 calls/day | $49/mo | 15-min delay free | Hobbyist/academic |
| **Financial Datasets API** | US stocks only | No | No | No | AAPL/NVDA/MSFT free | Unknown | Historical | Dexter's data source |
| **Intrinio** | Yes | No | No | No | Trial | $75/mo+ | Yes | High accuracy fundamentals |
| **Twelve Data** | Yes | Yes | Yes | No | 8 calls/min | $29/mo | Yes | Multi-asset time series |
| **Finnhub** | Yes | Yes | Yes | No | 60 calls/min | $49/mo | Yes | Real-time + alt data |
| **Quandl/Nasdaq Data Link** | Yes | Yes | Yes | Yes | Limited | $49/mo+ | Varies | Historical datasets |

### Recommended API Stack for wealth.Investing

**Primary: Financial Modeling Prep ($19/mo)**
- Covers ALL our asset classes: stocks, forex, crypto, commodities
- SEC filings, financial statements, key metrics
- Real-time WebSocket support
- Best price-to-coverage ratio
- 30+ years of historical data

**Secondary: Twelve Data ($29/mo)**
- Technical indicators (RSI, MACD, Bollinger, etc.)
- Multi-asset time series (stocks, FX, crypto)
- Clean API design

**Tertiary: Finnhub (free tier)**
- News and sentiment
- Economic calendar
- Insider transactions
- 60 calls/min free

**Total: ~$48/mo** for comprehensive multi-asset coverage

---

## 4. LLM Provider Comparison for Financial Analysis

| Model | Financial Accuracy | Token Efficiency | Cost (per 1M tokens) | Best For |
|-------|-------------------|-----------------|----------------------|----------|
| **GPT-5** | 88.23% (highest) | Medium | ~$15 input / $60 output | Maximum accuracy |
| **Claude Opus 4.6** | 87.82% | High (best efficiency) | ~$15 input / $75 output | Accuracy + efficiency |
| **GPT-5-mini** | 87.39% | High | ~$0.40 input / $1.60 output | Cost-effective accuracy |
| **Claude Sonnet 4.6** | ~82% (est.) | Very high | ~$3 input / $15 output | Production workloads |
| **Gemini 2.5 Flash** | 65.55% | High | ~$0.15 input / $0.60 output | Budget option |
| **DeepSeek** | 62.18% | Low (most tokens) | Very cheap | Not recommended for finance |

### Recommendation
- **For production analysis (Pro tier):** Claude Sonnet 4.6 or GPT-5-mini — best cost/accuracy balance
- **For premium analysis (one-off deep dives):** Claude Opus 4.6 — near-best accuracy, superior token efficiency
- **Avoid:** DeepSeek for financial work (low accuracy despite high token consumption)
- **We already use Claude** for AI Coach — staying with Anthropic reduces integration complexity

---

## 5. Key Questions Answered

### Is Dexter the best open-source option?
**Yes, for stock fundamental analysis.** No competitor matches its architecture. But it's unsuitable as our primary tool because:
1. US stocks only (we need forex/crypto/commodities)
2. No technical analysis
3. CLI-only, no API server
4. Data source (financialdatasets.ai) has limited coverage

### What LLM gives best results for financial analysis?
**GPT-5 is #1 (88.23%), Claude Opus 4.6 is #2 (87.82%)** but Claude is more token-efficient. For our cost structure (Vercel + Supabase + API costs), **Claude Sonnet 4.6** is the sweet spot — we already have Anthropic integration.

### Recommended stack for wealth.Investing?

```
┌──────────────────────────────────────────────────┐
│              wealth.Investing Stack               │
├──────────────────────────────────────────────────┤
│                                                  │
│  DATA LAYER                                      │
│  ├── Financial Modeling Prep ($19/mo)             │
│  │   └── Fundamentals, prices, forex, crypto     │
│  ├── Twelve Data ($29/mo)                        │
│  │   └── Technical indicators, time series       │
│  ├── Finnhub (free)                              │
│  │   └── News, sentiment, calendar               │
│  └── ForexFactory/TE (existing)                  │
│      └── Economic calendar, CB rates             │
│                                                  │
│  AI LAYER                                        │
│  ├── Claude Sonnet 4.6 (production)              │
│  │   └── Analysis narratives, AI Coach           │
│  └── Claude Opus 4.6 (premium deep dives)        │
│      └── DCF valuations, full research reports   │
│                                                  │
│  ANALYSIS MODULES (build custom)                 │
│  ├── Fundamental Analyzer                        │
│  │   └── Inspired by Dexter's approach           │
│  ├── Technical Analyzer                          │
│  │   └── RSI, MACD, support/resistance           │
│  ├── Sentiment Analyzer                          │
│  │   └── News + social sentiment scoring         │
│  ├── Risk Analyzer                               │
│  │   └── Drawdown, volatility, correlation       │
│  └── Macro Analyzer (existing)                   │
│      └── Calendar, narratives, CB rates          │
│                                                  │
│  INTEGRATION                                     │
│  ├── Dexter (optional, for stock deep-dives)     │
│  │   └── Fork & adapt as API service             │
│  └── Custom Agent (primary)                      │
│      └── Multi-asset, integrated with dashboard  │
│                                                  │
└──────────────────────────────────────────────────┘
```

### Build vs Integrate Dexter?

**Hybrid approach:**
1. **Build custom** for forex/crypto/commodities analysis (Dexter can't do this)
2. **Fork Dexter's patterns** (task planning, self-validation, scratchpad) for our agent architecture
3. **Optionally integrate Dexter** as a stock-specific deep-dive tool for Pro users
4. **Swap Financial Datasets API** for FMP (broader coverage, better pricing)

---

## 6. Competitive Positioning

Our dashboard already has advantages no competitor offers:
- **Prop trading focus** (The5ers, FTMO tracking)
- **Brazilian market** (BRL, PT-BR)
- **Macro intelligence** (calendar + narratives)
- **Journal + analytics** (not just data)

Adding AI analysis would put us ahead of:
- FinChat (no journal, no prop trading)
- Koyfin (no AI analysis, no journal)
- Simply Wall St (stocks only, no trading journal)

The closest competitor would be a **TradingView + FinChat + prop firm tracker** combo — which costs $50+/mo and still lacks integration.

---

## Sources

### Open Source
- [virattt/dexter](https://github.com/virattt/dexter)
- [Dexter: The 200-Line Financial Agent](https://medium.com/coding-nexus/dexter-the-200-line-open-source-financial-agent-that-thinks-for-itself-b22031a5c66f)
- [TradingGoose](https://github.com/TradingGoose/TradingGoose.github.io)
- [Agentic-Analyst/stock-analyst](https://github.com/Agentic-Analyst/stock-analyst)

### Commercial Platforms
- [FinChat Review 2026](https://traderhq.com/finchat-review-ai-financial-assistant-smart-investors/)
- [Best FinChat Alternatives](https://www.gainify.io/blog/best-finchat-alternatives)
- [Koyfin Alternatives](https://www.bitcoinmagazinepro.com/blog/15-best-koyfin-alternatives-for-smarter-financial-analysis/)
- [Morningstar vs Simply Wall St vs Seeking Alpha](https://mind-treks.com/morningstar-vs-simply-wall-st-vs-seeking-alpha-comparison/)
- [Simply Wall St Review 2026](https://traderhq.com/simply-wall-st-review-best-investment-analysis-tool-for-all-investors/)
- [Best Stock Analysis Tools 2026](https://www.gainify.io/blog/best-stock-research-apps)

### Data APIs
- [Best Financial Data APIs 2026](https://www.nb-data.com/p/best-financial-data-apis-in-2026)
- [Financial APIs Compared: Polygon vs IEX vs Alpha Vantage](https://www.ksred.com/the-complete-guide-to-financial-data-apis-building-your-own-stock-market-data-pipeline-in-2025/)
- [Top Algo Trading APIs 2026](https://medium.com/coinmonks/top-algo-trading-apis-in-2025-e7f1173eb38b)
- [Polygon.io Pricing](https://polygon.io/pricing)
- [FMP Real-Time APIs](https://site.financialmodelingprep.com/education/other/best-realtime-stock-market-data-apis-in-)

### LLM Benchmarks
- [Benchmark of 38 LLMs in Finance](https://aimultiple.com/finance-llm)
- [LLM API Pricing Comparison 2025](https://intuitionlabs.ai/articles/llm-api-pricing-comparison-2025)
- [AI Model Benchmarks March 2026](https://lmcouncil.ai/benchmarks)
- [Best LLMs for Financial Analysis 2026](https://www.azilen.com/learning/best-llms-for-financial-analysis/)
- [7 Best LLMs for Financial Analysis](https://www.azilen.com/learning/best-llms-for-financial-analysis/)
