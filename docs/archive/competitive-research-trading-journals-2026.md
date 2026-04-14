# Competitive Research: Trading Journal Platforms (March 2026)

> Comprehensive market research across 7+ platforms to inform wealth.Investing journal product design.

---

## 1. TRADE LOGGING — How Users Add Trades

### Import Methods (Industry Standard)
| Platform | Auto-Sync | File Upload | Manual Entry |
|----------|-----------|-------------|--------------|
| **Tradezella** | Yes (broker sync) | Yes (CSV) | Yes (per-execution) |
| **TraderSync** | Yes (900+ brokers) | Yes (CSV) | Yes (stocks/futures/crypto only — options MUST be imported) |
| **Edgewonk** | Yes (200+ brokers, 60 platforms) | Yes | Yes |
| **Chartlog** | Yes (direct broker connect) | Yes | Yes |
| **Kinfo** | Yes (read-only broker API) | No | No (auto-import only) |
| **FX Replay** | Auto (from backtesting) | N/A | N/A (trades logged during replay) |

### Manual Entry UX Pattern (Industry Standard)
The most common pattern across Tradezella, TraderSync, and Edgewonk:

1. **Select asset type** (stock, option, future, forex, crypto)
2. **Enter symbol/ticker**
3. **Add executions individually** — each execution has:
   - Date/Time
   - Side (Buy/Sell)
   - Quantity (shares/contracts/lots)
   - Price
   - Commission & Fees
4. **Asset-specific fields appear conditionally:**
   - Futures: Contract Multiplier
   - Options: Strike Price, Expiration Date, Spread Type
   - Forex: Lot Size, Pip Value

**Key insight:** Tradezella requires adding entry and exit as **separate executions** — this supports partial fills, scaling in/out, and multi-leg trades. This is the professional standard.

**TraderSync limitation:** Options cannot be entered manually due to complexity — must be imported from broker.

---

## 2. TRADE FIELDS — What Data Each Trade Captures

### Core Fields (present in ALL platforms)
| Field | Description |
|-------|-------------|
| Symbol/Ticker | The instrument traded |
| Direction | Long/Short (Buy/Sell) |
| Entry Price | Price at open |
| Exit Price | Price at close |
| Position Size | Shares, contracts, or lots |
| Entry Date/Time | When opened |
| Exit Date/Time | When closed |
| Gross P&L | Raw profit/loss |
| Net P&L | After commissions/fees |
| Commissions | Broker commission |
| Fees | Exchange/regulatory fees |

### Extended Fields (premium/advanced platforms)
| Field | Platforms | Description |
|-------|-----------|-------------|
| Stop Loss | Tradezella, Edgewonk | Planned stop level |
| Take Profit | Tradezella, Edgewonk | Planned target level |
| Risk (R-value) | Tradezella, Edgewonk, TraderSync | PnL divided by risk amount |
| Risk/Reward Ratio | All | Planned R:R before entry |
| MAE (Max Adverse Excursion) | TraderSync, Edgewonk, Tradervue | How far price went against you |
| MFE (Max Favorable Excursion) | TraderSync, Edgewonk, Tradervue | How far price went in your favor |
| Hold Duration | Tradezella, TraderSync | Time in trade |
| Account | All | Which account the trade is in |
| Screenshots | All except Kinfo | Before/after/during charts |
| Trade Rating | Edgewonk | Self-score on entry/exit/management |

### Edgewonk-specific: up to 6 screenshots per trade, entry/exit/management comments rated positive/negative/neutral.

---

## 3. NOTES & OBSERVATIONS — How Users Document Trades

### Per-Trade Notes
All platforms support free-text notes on individual trades. The standard approach:
- **Pre-trade thesis** — Why you took the trade
- **During-trade observations** — What happened, market conditions
- **Post-trade review** — What went right/wrong, lessons learned

### Notebooks / Daily Journals
| Platform | Feature Name | Description |
|----------|-------------|-------------|
| **Tradezella** | Notebook | Personal journaling space: daily notes, pre-market plans, post-session reviews. Custom templates. Syncs with trading stats. |
| **TraderSync** | Notes | Per-trade notes with emotions and reasoning |
| **Edgewonk** | Trading Diary | Integrated diary with screenshots, lessons, breakthrough moments |
| **Chartlog** | Notes | Per-trade text notes |

### Tradezella's "Start My Day" Workflow (standout feature)
1. **Pre-Market Prep** — Economic calendar, game plan, mindset check
2. **Intraday Check-In** — Timed templates to stay disciplined
3. **Post-Session Review** — Analyze the day, tag mistakes, note lessons

### Tradezella Playbooks
Structured strategy documentation:
- Define entry rules, exit rules, confluences
- Tag trades with playbook used
- Over time, reveals which "playbook" generates the most edge

---

## 4. TAGS & LABELS — How Platforms Handle Categorization

### Tagging Architecture

| Platform | Tag System | Pre-built Tags | Custom Tags | Tag Groups |
|----------|-----------|---------------|-------------|------------|
| **Tradezella** | Multi-category | Yes (setup, emotion, mistake) | Yes (unlimited) | Yes |
| **TraderSync** | Multi-category | Yes (emotion, setup, session) | Yes | Yes |
| **Edgewonk** | Custom Statistics | No (fully custom) | Yes (up to 20 categories, multiple tags each) | Yes (20 groups) |
| **Chartlog** | Simple tags | No | Yes | No |
| **FX Replay** | Custom tags | No | Yes (appear as filters in analytics) | No |

### Common Tag Categories (Industry Standard)
1. **Setup/Strategy** — breakout, mean-reversion, gap-fill, trend-following, reversal, range-play
2. **Emotions** — confident, fearful, greedy, FOMO, revenge, calm, hesitant, overconfident
3. **Mistakes** — early entry, late exit, oversized, broke rules, chased, no stop-loss, moved stop
4. **Market Conditions** — trending, ranging, choppy, high-volatility, news-driven, low-volume
5. **Time/Session** — London open, NY open, Asian session, pre-market, after-hours
6. **Quality Rating** — A+, A, B, C setup quality

### Best Practice: Emotion → P&L Correlation
TradesViz pioneered the "Cost of Emotion" audit:
- Create tags: FOMO, REVENGE, HESITATION, OVERSIZE
- Use Pivot Grid to drag psychological tags vs Total P&L
- Quantifies exact dollar cost of each emotional state

### Edgewonk Custom Statistics (Most Flexible)
- Up to 20 separate categories (e.g., "Market Trend", "Entry Quality", "News Impact")
- Each category has multiple tags (e.g., Market Trend → Uptrend, Downtrend, Sideways)
- Custom Statistics graph shows which tags perform best/worst
- Fully user-defined — no predefined structure

---

## 5. CALENDAR VIEW — What Shows on Each Day

### Standard Calendar Design (All Platforms)
- **Monthly grid** layout (standard calendar)
- Each day cell shows: **Net P&L** (green for profit, red for loss)
- Color intensity indicates magnitude
- Click a day → see all trades for that day

### Tradezella Calendar (Most Advanced)
- Monthly Summary: total P&L + trading days count per month
- Weekly Breakdown: weekly P&L with trading day counts
- Daily cells: net P&L with color coding
- Click any day → full trade list with details

### TraderSync Calendar
- Shareable PnL calendar (social feature)
- Shows profitable/unprofitable days at a glance
- Monthly view with daily P&L values

### Chartlog Calendar
- Calendar view + table view toggle
- Calendar: daily P&L cells, good for reviewing specific days
- Table: quick access to metrics and filter options

### TradesViz Calendar (Most Interactive)
- View P&L, tags, comments, wins in each cell
- Click any cell to explore the trading day in detail
- Shows progress toward daily/weekly/monthly goals
- Can overlay win-rate, max risk alongside P&L

### Key Calendar UX Insights
1. Green/red color coding is universal — intensity shows magnitude
2. Weekly subtotals are expected by serious traders
3. Click-to-drill-down is mandatory
4. Monthly summary row/footer is standard
5. Best calendars show trade COUNT alongside P&L per day

---

## 6. ANALYTICS & STATISTICS — What Platforms Report

### Tier 1: Basic Metrics (Every Journal Must Have)
| Metric | Description |
|--------|-------------|
| Total P&L | Gross and net |
| Win Rate | % of profitable trades |
| Profit Factor | Avg win / Avg loss |
| Average Win | Mean profit on winning trades |
| Average Loss | Mean loss on losing trades |
| Largest Win | Single best trade |
| Largest Loss | Single worst trade |
| Total Trades | Count |
| # Winners / # Losers | Count |
| Equity Curve | Account balance over time |

### Tier 2: Intermediate Metrics (Competitive Journals)
| Metric | Description |
|--------|-------------|
| Expectancy | (Win% × Avg Win) - (Loss% × Avg Loss) |
| R-Multiple Distribution | PnL normalized by risk |
| Risk/Reward Ratio (Avg) | Planned vs actual R:R |
| Max Drawdown | Peak-to-trough account decline |
| Recovery Factor | Net profit / Max drawdown |
| Avg Hold Duration | Time in trades |
| Best/Worst Day | Daily P&L extremes |
| Best/Worst Setup | P&L by tagged setup type |
| Performance by Day of Week | Which days you're most profitable |
| Performance by Time of Day | Which hours you're most profitable |
| Consecutive Wins/Losses | Streak tracking |

### Tier 3: Advanced Metrics (Premium Differentiators)
| Metric | Platform(s) | Description |
|--------|------------|-------------|
| MAE/MFE | TraderSync, Edgewonk, Tradervue | Max adverse/favorable price excursion during trade |
| Tiltmeter | Edgewonk | Discipline score based on rule compliance |
| Exit Analysis | Edgewonk, Tradervue | How close price came to stops/targets |
| Sector/Industry Breakdown | Chartlog (premium) | Performance by market sector |
| Cost of Emotion | TradesViz | Dollar impact of emotional tags |
| Trade Replay | TraderSync, FX Replay | Replay market sessions with your trades overlaid |
| AI Pattern Detection | TraderSync (Cypher) | ML-based pattern identification across trade history |
| Playbook Performance | Tradezella | P&L breakdown by strategy playbook |
| Custom Report Builder | Chartlog (premium) | Build your own analytics views |
| Streak Analysis | TraderSync | Win/loss streak impact on subsequent performance |

### TradesViz Standout: 600+ statistics, 70+ interactive charts, customizable dashboards with 600+ widgets

---

## 7. UNIQUE/STANDOUT FEATURES BY PLATFORM

### Tradezella
- **"Start My Day" workflow** — Pre-market prep + intraday check-in + post-session review
- **Playbook system** — Structured strategy documentation with confluence tracking
- **Backtesting + Replay** — built into same platform as journal
- **Mentorship integration** — coaches can review student journals
- **Economic Calendar** integration (Premium)
- **All-in-one platform** — journaling + backtesting + replay + education

### TraderSync
- **Cypher AI** — ML-powered analysis that identifies patterns you miss, gives specific recommendations
- **900+ broker integrations** — widest broker support
- **Trade Replay** — Replay past sessions at 250ms precision for scalping review
- **Shareable PnL Calendar** — Social/community feature
- **Commission tracking** — detailed fee analysis

### Edgewonk
- **Tiltmeter** — Unique discipline visualization (green = following rules, red = violating)
- **Custom Statistics** (20 categories) — most flexible tagging system
- **Trade Comments** — Rate entry/exit/management quality as positive/negative/neutral
- **Exit Analysis graphs** — Visual representation of how price moved relative to stops/targets
- **6 screenshots per trade** — Most generous media attachment
- **One-time pricing** ($169/year) — No monthly recurring
- **Psychology-first approach** — Entire platform built around behavioral improvement

### Chartlog
- **TradingView chart integration** — Charts with entry/exit markers right next to journal
- **Sector/Industry analytics** (premium) — Unique for stock traders
- **Clean, simple UI** — Less overwhelming than data-heavy competitors
- **Market cap studies** — Analyze performance by company size

### Kinfo
- **Social trading leaderboard** — Verified performance rankings
- **Mobile-first** — Best mobile experience
- **Privacy controls** — Share optionally, private by default
- **Community discovery** — Find and follow top performers
- **Free core product** — Generous free tier

### FX Replay
- **Backtesting-first** — Journal is integrated into backtesting workflow
- **Historical data to 2003** — Deep backtesting capability
- **Economic calendar overlay** — See news events on charts during replay
- **Auto-logged during replay** — Zero manual entry needed

---

## 8. DAILY REVIEW WORKFLOW — Best Practices

### Tradezella's Full Workflow (Gold Standard)
1. **Pre-Market (5 min)**
   - Open "Start My Day"
   - Check economic calendar
   - Write if/then game plan
   - Note current mindset/emotions
2. **Intraday (2-3 min per check-in)**
   - Use "Intraday Check-In" template
   - Rate discipline at timed intervals
3. **Post-Session (10-15 min)**
   - Review all trades taken
   - Add notes/observations to each trade
   - Tag emotions, mistakes, setups
   - Screenshot key charts
   - Write daily journal entry in Notebook
4. **Weekly Review (30 min)**
   - Check win rate by setup type
   - R-multiple distribution
   - Mistake frequency trends
   - Time-of-day performance
   - Rule compliance percentage
   - Set one improvement action item for next week

### Recommended Daily Tagging Cadence
- **Daily:** 2-3 minutes tagging trades with emotions and mistakes
- **Weekly:** 30-minute review checking patterns, setting one action item
- **Monthly:** Deep dive into Custom Statistics / tag performance

---

## 9. PRICING COMPARISON

| Platform | Free Tier | Basic | Pro/Premium | Billing |
|----------|-----------|-------|-------------|---------|
| **Tradezella** | No | $29/mo ($24/mo annual) | $49/mo ($33/mo annual) | Monthly/Annual |
| **TraderSync** | No | $29.95/mo | $79.95/mo (Elite) | Monthly/Annual |
| **Edgewonk** | No | $169/year (all features) | — | Annual only |
| **Chartlog** | Yes (limited) | $9.99/mo | $24.99/mo | Monthly/Annual |
| **Kinfo** | Yes (core tracking) | Pro (undisclosed) | — | Monthly |
| **FX Replay** | Yes (limited) | $17/mo | $47/mo | Monthly/Annual |
| **TradesViz** | Yes (3000 exec/mo) | $19.99/mo | $29.99/mo | Monthly/Annual |
| **Tradervue** | Yes (100 trades/mo) | $29.95/mo | $49.95/mo | Monthly |

---

## 10. KEY FINDINGS & RECOMMENDATIONS

### Minimum Viable Feature Set for a Competitive Journal
1. **Trade import** — CSV/file upload at minimum; broker sync is table-stakes for premium
2. **Manual trade entry** — Per-execution form with all core fields
3. **P&L Calendar** — Monthly grid with daily P&L, color-coded, click-to-drill
4. **Core analytics** — Win rate, profit factor, expectancy, equity curve, avg win/loss
5. **Tags** — At least setup type, emotion, and mistake categories
6. **Notes** — Free-text per trade
7. **Screenshots** — Attach chart images to trades

### Features That Differentiate Premium from Basic
| Feature | Impact | Difficulty |
|---------|--------|------------|
| AI-powered insights (like Cypher) | HIGH — major selling point | HIGH |
| Playbook system | HIGH — strategy documentation | MEDIUM |
| MAE/MFE analysis | MEDIUM — exit optimization | MEDIUM |
| Trade replay | HIGH — visual learning | HIGH |
| Tiltmeter / discipline scoring | HIGH — unique differentiator | MEDIUM |
| Custom statistics / pivot tables | HIGH — power users love this | MEDIUM |
| Social features / leaderboard | MEDIUM — community value | HIGH |
| Pre/Post-market templates | MEDIUM — workflow improvement | LOW |
| Economic calendar integration | MEDIUM — context for trades | LOW (already built) |

### Most Common Manual Entry UX Pattern
1. Big "Add Trade" / "+" button (top-right or floating)
2. Asset type selector (tabs or dropdown)
3. Symbol search with autocomplete
4. Side selector (Buy/Sell as toggle buttons)
5. Execution details in a clean form (date, time, qty, price, fees)
6. "Add Another Execution" button for scaling
7. After saving: trade detail page with notes, tags, screenshots sections

### Best Trade Tagging Architecture
Three-layer system:
1. **Tag Groups** (categories) — Setup Type, Emotion, Mistake, Market Condition, Session
2. **Tags** (values within groups) — user-defined, unlimited
3. **Analytics integration** — Filter all reports by any tag combination, pivot P&L by tag

### What wealth.Investing Should Prioritize
Given the existing infrastructure (Supabase, journal_trades table, prop account tracking):

**Phase 1 (MVP Journal Enhancement):**
- Enhanced manual entry form with all core fields
- Tag system (3 groups: Setup, Emotion, Mistake) with custom tags
- PnL calendar with daily/weekly/monthly views
- Core analytics dashboard (win rate, PF, expectancy, equity curve)
- Per-trade notes + screenshot upload

**Phase 2 (Competitive Differentiation):**
- Pre/Post-market notebook (already have Macro page as foundation)
- Playbook system tied to tags
- Performance by tag analytics (which setup/emotion/time is most profitable)
- R-multiple tracking with stop-loss field

**Phase 3 (Premium Features):**
- AI Coach integration with journal data (already have AI Coach)
- Tiltmeter-style discipline scoring
- MAE/MFE tracking
- Trade replay (TradingView widget integration)

---

## Sources

- [Tradezella Features](https://www.tradezella.com/features)
- [Tradezella Manual Trade Entry](https://help.tradezella.com/en/articles/5829532-how-to-add-a-trade-manually-in-tradezella)
- [Tradezella Complete Guide](https://www.tradezella.com/blog/trading-journal-complete-guide)
- [TraderSync Features](https://tradersync.com/features/)
- [TraderSync Manual Entry](https://tradersync.com/support/how-to-add-a-new-trade-manually/)
- [TraderSync MAE/MFE](https://tradersync.com/mfe-and-mae-metrics/)
- [Edgewonk Features](https://edgewonk.com/features)
- [Edgewonk Metrics Explained](https://tradeciety.com/all-edgewonks-metrics-and-statistics-explained-for-successful-journaling)
- [Edgewonk Tiltmeter](https://edgewonk.zendesk.com/hc/en-us/articles/360010150259-The-Tiltmeter)
- [Chartlog Review](https://trading-journals.com/reviews/chartlog)
- [Kinfo Journal](https://kinfo.com/the-kinfo-trading-journal/)
- [FX Replay Trading Journal](https://www.fxreplay.com/trading-journal)
- [FX Replay Trade Logging](https://support.fxreplay.com/articles/trades-and-logging)
- [TradesViz Advanced Stats](https://www.tradesviz.com/blog/advanced-stats/)
- [TradesViz Psychology Tracking](https://www.tradesviz.com/blog/trading-journal-psychology-tracking/)
- [Best Trading Journals 2026 - StockBrokers](https://www.stockbrokers.com/guides/best-trading-journals)
- [Best Trading Journals 2026 - Tradeciety](https://tradeciety.com/best-online-trading-journals)
- [Best Trading Journal 2026 - TradesViz](https://www.tradesviz.com/blog/best-trading-journal-2026-comparison/)
- [Tradezella vs TraderSync](https://www.tradezella.com/blog/tradezella-vs-tradersync-here-is-what-you-need-to-know)
- [Tradezella Review - StockBrokers](https://www.stockbrokers.com/review/tools/tradezella)
- [Tradezella Review - QuantVPS](https://www.quantvps.com/blog/tradezella-review)
