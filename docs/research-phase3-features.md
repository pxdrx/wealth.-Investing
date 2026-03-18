# Phase 3 Features Research — Technical Spec Foundation

> Compiled: 2026-03-18 | For: wealth.Investing trading dashboard

---

## 1. MFE/MAE Analysis (Maximum Favorable/Adverse Excursion)

### Definitions
- **MAE (Maximum Adverse Excursion):** The largest unrealized loss from entry price to the worst point during a trade before close.
- **MFE (Maximum Favorable Excursion):** The largest unrealized profit from entry price to the best point during a trade before close.

### Data Requirements (Full Precision)
| Field | Purpose |
|-------|---------|
| `entry_price` | Trade open price |
| `exit_price` | Trade close price |
| `high_price` (during trade) | For MFE calculation (longs) |
| `low_price` (during trade) | For MAE calculation (longs) |
| `direction` (long/short) | Inverts MFE/MAE logic |
| `position_size` or `lot_size` | Convert price-based to dollar-based |

**Formulas:**
```
Long MFE = (highest_price - entry_price) * position_size
Long MAE = (entry_price - lowest_price) * position_size
Short MFE = (entry_price - lowest_price) * position_size
Short MAE = (highest_price - entry_price) * position_size
```

### Can MFE/MAE Be Approximated Without Tick Data?

**Yes, but with caveats.** Our current schema has: `symbol, direction, pnl_usd, opened_at, closed_at`.

**Approximation strategies:**
1. **OHLC candle data:** Fetch H/L of each candle during the trade's timeframe (opened_at → closed_at) from an external API (e.g., free Yahoo Finance, TradingView widget data). Use the highest high for MFE (longs) and lowest low for MAE (longs).
2. **User-input fields:** Add optional `mfe_usd` and `mae_usd` columns. Let users manually input or have the MT5/cTrader parser extract them (MT5 detailed reports include these).
3. **Derived proxy metric:** Without intraday data, compute `Realized PnL / Theoretical Max PnL` as an "exit efficiency" ratio. This requires at minimum OHLC data for the trade period.
4. **Running PnL approach (TradesViz-style):** Use `running_max_pnl` and `running_min_pnl` — simpler but requires position-level tracking.

**Recommendation:** Add `mfe_usd` and `mae_usd` as nullable columns to `journal_trades`. Populate from parsers when available, allow manual entry, and optionally fetch OHLC data via API for approximation.

### Standard Visualizations

| Chart | X-Axis | Y-Axis | Purpose |
|-------|--------|--------|---------|
| **MAE Scatter** | MAE ($) | Final PnL ($) | Shows if losers had excessive adverse excursion |
| **MFE Scatter** | MFE ($) | Final PnL ($) | Shows if winners gave back too much profit |
| **MAE Distribution** | MAE buckets | Frequency | Histogram of adverse excursions |
| **MFE Distribution** | MFE buckets | Frequency | Histogram of favorable excursions |
| **MFE vs MAE Scatter** | MAE ($) | MFE ($) | Color by win/loss — quadrant analysis |
| **Exit Efficiency** | Trade # | MFE/PnL ratio | Time series of exit quality |
| **Duration to MFE/MAE** | Time (min) | MFE/MAE ($) | When extremes happen (TradesViz feature) |

**How Tradervue does it:** Scatter plot of PnL vs MAE (or MFE), with each dot being a trade. Winning trades are green, losing trades are red. Helps identify optimal stop-loss placement.

**How Edgewonk does it:** Integrated into their "Trade Management" analysis. Shows MFE/MAE alongside exit efficiency metrics. Emphasizes how much money was "left on the table."

---

## 2. Trading Psychology Tags — Best Practices

### Emotion Categories (Industry Standard)

#### Pre-Trade Emotions (how you felt entering)
| Tag | Description |
|-----|-------------|
| `confident` | Clear plan, high conviction |
| `calm` | Neutral, disciplined state |
| `anxious` | Nervous, uncertain |
| `fearful` | Scared of losing, hesitant |
| `excited` | Overly eager, adrenaline |
| `bored` | Taking trade for action, not edge |
| `frustrated` | Annoyed from prior losses |
| `revenge` | Trying to recover losses impulsively |
| `fomo` | Fear of missing out on a move |
| `greedy` | Oversizing or ignoring risk |
| `overconfident` | Inflated by recent wins |
| `impatient` | Entering too early, not waiting for setup |
| `neutral` | No strong emotion |

#### Discipline / Mistake Categories
| Tag | Description |
|-----|-------------|
| `followed_plan` | Executed exactly per plan |
| `early_entry` | Entered before confirmation |
| `late_entry` | Entered after optimal point |
| `early_exit` | Closed too soon (fear-based) |
| `late_exit` | Held too long (greed/hope) |
| `moved_stop` | Moved stop-loss in wrong direction |
| `no_stop` | Traded without stop-loss |
| `oversized` | Position too large for risk |
| `undersized` | Position too small (fear) |
| `revenge_trade` | Impulsive trade after loss |
| `fomo_trade` | Chased price |
| `overtraded` | Too many trades in session |
| `break_rules` | Violated trading plan rules |
| `perfect_execution` | Flawless setup + execution |

#### Trade Setup Quality
| Tag | Description |
|-----|-------------|
| `a_plus_setup` | Perfect setup alignment |
| `b_setup` | Good but not ideal |
| `c_setup` | Below average, marginal |
| `no_setup` | No real edge, gamble |

### Edgewonk Tiltmeter — Conceptual Model

The Tiltmeter works by:
1. **Each trade gets 3 sub-ratings** (entry, exit, trade management) rated as: positive (+1), neutral (0), negative (-1)
2. **Composite discipline score** = sum of the 3 ratings (-3 to +3)
3. **Rolling window** (e.g., last 10-20 trades) calculates average discipline score
4. **Visual indicator** (like a meter/gauge) shows current "tilt level"
5. **Correlation analysis** links discipline score to PnL outcomes

**Key insight:** The Tiltmeter provides an *early warning system*. When discipline score trends downward over several trades, it signals the trader should stop and reassess.

### Analytics Derivable from Psychology Tags

| Analysis | Description |
|----------|-------------|
| **Win rate by emotion** | "When anxious, win rate drops to 35%" |
| **Avg PnL by emotion** | "Calm trades average +$120, revenge trades average -$85" |
| **Emotion frequency** | "40% of trades marked as FOMO this week" |
| **Discipline trend** | Rolling avg discipline score over time |
| **Mistake cost** | "Moving stops cost you $2,400 this month" |
| **Best/worst emotion** | Rank emotions by PnL impact |
| **Setup quality vs outcome** | "A+ setups: 72% win rate, C setups: 38%" |
| **Time-of-day emotion patterns** | "Afternoon trades more likely to be revenge" |
| **Post-loss behavior** | "After 2+ losses, 60% of next trades are revenge" |
| **Tilt detection** | Alert when discipline score drops below threshold |

### Implementation Schema Suggestion

```sql
-- New columns on journal_trades:
ALTER TABLE journal_trades ADD COLUMN emotion TEXT;          -- pre-trade emotion tag
ALTER TABLE journal_trades ADD COLUMN discipline TEXT;       -- discipline/mistake tag
ALTER TABLE journal_trades ADD COLUMN setup_quality TEXT;    -- a_plus, b, c, none
ALTER TABLE journal_trades ADD COLUMN entry_rating SMALLINT; -- -1, 0, +1
ALTER TABLE journal_trades ADD COLUMN exit_rating SMALLINT;  -- -1, 0, +1
ALTER TABLE journal_trades ADD COLUMN management_rating SMALLINT; -- -1, 0, +1
ALTER TABLE journal_trades ADD COLUMN notes TEXT;            -- free-form notes
ALTER TABLE journal_trades ADD COLUMN mfe_usd NUMERIC;      -- nullable, for MFE/MAE
ALTER TABLE journal_trades ADD COLUMN mae_usd NUMERIC;      -- nullable, for MFE/MAE
```

---

## 3. Trading Analytics Metrics — Complete Reference

### Top 20 Metrics for Serious Traders

| # | Metric | Formula | Calculable? | Notes |
|---|--------|---------|-------------|-------|
| 1 | **Total PnL** | `SUM(pnl_usd)` | YES | Core metric |
| 2 | **Net PnL** | `SUM(net_pnl_usd)` or `SUM(pnl_usd) - SUM(fees_usd)` | YES | After fees |
| 3 | **Win Rate** | `winning_trades / total_trades` | YES | Trade where `pnl_usd > 0` |
| 4 | **Loss Rate** | `losing_trades / total_trades` | YES | `1 - win_rate` |
| 5 | **Profit Factor** | `SUM(winning_pnl) / ABS(SUM(losing_pnl))` | YES | >1.5 is good, >2.0 excellent |
| 6 | **Expectancy** | `(win_rate × avg_win) - (loss_rate × avg_loss)` | YES | Avg expected $ per trade |
| 7 | **Expectancy (R)** | `(win_rate × avg_win_R) - (loss_rate × 1)` | PARTIAL | Needs risk-per-trade data |
| 8 | **Average Win** | `SUM(winning_pnl) / count(winning_trades)` | YES | |
| 9 | **Average Loss** | `SUM(losing_pnl) / count(losing_trades)` | YES | |
| 10 | **Avg Risk:Reward** | `avg_win / abs(avg_loss)` | YES | Realized RR ratio |
| 11 | **Largest Win** | `MAX(pnl_usd)` | YES | |
| 12 | **Largest Loss** | `MIN(pnl_usd)` | YES | |
| 13 | **Max Consecutive Wins** | Sequential count of wins | YES | Requires ordering by `closed_at` |
| 14 | **Max Consecutive Losses** | Sequential count of losses | YES | Requires ordering by `closed_at` |
| 15 | **Sharpe Ratio** | `(mean_return - risk_free) / std_dev(returns)` | YES | Use daily returns, risk_free ≈ 0 for simplicity |
| 16 | **Sortino Ratio** | `(mean_return - risk_free) / std_dev(negative_returns)` | YES | Only downside deviation |
| 17 | **Max Drawdown** | Largest peak-to-trough decline in cumulative PnL | YES | Running equity curve |
| 18 | **Calmar Ratio** | `annualized_return / max_drawdown` | YES | Needs sufficient history |
| 19 | **Avg Trade Duration** | `AVG(closed_at - opened_at)` | YES | |
| 20 | **Trades per Day/Week** | `COUNT / trading_days` | YES | Activity metric |

### Additional Useful Metrics

| Metric | Formula | Calculable? |
|--------|---------|-------------|
| **Win/Loss Ratio** | `avg_win / abs(avg_loss)` | YES |
| **Kelly Criterion** | `win_rate - (loss_rate / (avg_win / abs(avg_loss)))` | YES |
| **Recovery Factor** | `net_profit / max_drawdown` | YES |
| **Payoff Ratio** | `avg_win / abs(avg_loss)` | YES |
| **CPC Index** | `profit_factor × win_rate × payoff_ratio` | YES |
| **PnL by Symbol** | `GROUP BY symbol, SUM(pnl_usd)` | YES |
| **PnL by Direction** | `GROUP BY direction, SUM(pnl_usd)` | YES |
| **PnL by Day of Week** | `GROUP BY day_of_week(closed_at)` | YES |
| **PnL by Hour** | `GROUP BY hour(opened_at)` | YES |
| **Equity Curve** | Running `SUM(pnl_usd) OVER (ORDER BY closed_at)` | YES |
| **Drawdown Curve** | Peak equity minus current equity over time | YES |
| **Time in Drawdown** | Duration spent below equity peak | YES |

### Detailed Formulas

#### Sharpe Ratio (Daily)
```
daily_returns[] = PnL of each trading day
mean_return = AVG(daily_returns)
std_dev = STDDEV(daily_returns)
sharpe_daily = mean_return / std_dev
sharpe_annualized = sharpe_daily × √252
```
- Above 1.0 = good, above 2.0 = excellent

#### Sortino Ratio (Daily)
```
daily_returns[] = PnL of each trading day
mean_return = AVG(daily_returns)
downside_returns[] = daily_returns.filter(r => r < 0)
downside_dev = STDDEV(downside_returns)
sortino_daily = mean_return / downside_dev
sortino_annualized = sortino_daily × √252
```
- Better than Sharpe for traders (ignores upside volatility)

#### Max Drawdown
```
equity_curve[i] = SUM(pnl_usd) for trades 1..i
peak[i] = MAX(equity_curve[1..i])
drawdown[i] = equity_curve[i] - peak[i]
max_drawdown = MIN(drawdown[])  // most negative value
max_drawdown_pct = max_drawdown / peak_at_max_dd
```

#### Kelly Criterion
```
kelly_pct = win_rate - (loss_rate / win_loss_ratio)
// where win_loss_ratio = avg_win / abs(avg_loss)
// Result is fraction of capital to risk per trade
// Practical: use half-Kelly (kelly_pct / 2) for safety
```

#### Expectancy per Trade
```
expectancy = (win_rate × avg_win) - (loss_rate × avg_loss)
// Positive = edge exists
// $0 = breakeven
// Negative = losing system
```

#### Profit Factor
```
profit_factor = gross_profits / abs(gross_losses)
// 1.0 = breakeven
// 1.5+ = good
// 2.0+ = excellent
// 3.0+ = exceptional (may indicate small sample)
```

### What's Calculable from Our Current Schema

**Available fields:** `symbol, direction, pnl_usd, net_pnl_usd, opened_at, closed_at, fees_usd, account_id, user_id`

**Fully calculable (17/20 top metrics):** Metrics 1-6, 8-20 from the top 20 list above.

**Partially calculable:**
- Expectancy in R-multiples (#7) — needs `risk_per_trade` or stop-loss distance
- MFE/MAE — needs additional data (new columns or external API)

**Not calculable without new data:**
- Position sizing analysis — needs `lot_size` or `position_size`
- R-multiple distribution — needs planned risk per trade

---

## Sources

### MFE/MAE
- [Trademetria - Understanding MAE and MFE Metrics](https://trademetria.com/blog/understanding-mae-and-mfe-metrics-a-guide-for-traders/)
- [QuantifiedStrategies - MAE and MFE Explained](https://www.quantifiedstrategies.com/maximum-adverse-excursion-and-maximum-favorable-excursion/)
- [TradingDiary Pro - MAE MFE Explained](https://www.tradingdiarypro.com/mae-mfe-explained/)
- [Tradervue - MFE and MAE Calculations](https://help.tradervue.com/article/3440-mfe-and-mae-calculations)
- [TradesViz - MFE MAE Duration Analysis](https://www.tradesviz.com/blog/mfe-mae-duration/)
- [TradesViz - Advanced Stats (Running PnL)](https://www.tradesviz.com/blog/advanced-stats/)
- [TraderSync - MFE and MAE Metrics](https://tradersync.com/mfe-and-mae-metrics/)

### Psychology Tags & Edgewonk
- [Edgewonk - Features](https://edgewonk.com/features)
- [Edgewonk - The Tiltmeter](https://edgewonk.zendesk.com/hc/en-us/articles/360010150259-The-Tiltmeter)
- [Edgewonk - Mastering Discipline with Tiltmeter](https://edgewonk.com/blog/mastering-trading-discipline-with-edgewonks-tiltmeter)
- [Tradeciety - All Edgewonk Metrics Explained](https://tradeciety.com/all-edgewonks-metrics-and-statistics-explained-for-successful-journaling)
- [Britannica - Trading Psychology](https://www.britannica.com/money/trading-psychology)
- [FX Replay - Mastering Emotions](https://www.fxreplay.com/learn/trading-psychology-mastering-your-emotions-in-the-market)

### Analytics Metrics
- [JournalPlus - Calculate Trading Performance](https://journalplus.co/blog/how-to-calculate-trading-performance/)
- [LuxAlgo - Top Metrics for Evaluating Strategies](https://www.luxalgo.com/blog/top-5-metrics-for-evaluating-trading-strategies/)
- [QuantifiedStrategies - Trading Performance](https://www.quantifiedstrategies.com/trading-performance/)
- [TradingMetrics - Sortino Ratio](https://docs.tradingmetrics.com/en/technical-analysis/trading-metrics/efficiency-metrics/sortino-ratio)
- [QuantStart - Sharpe Ratio](https://www.quantstart.com/articles/Sharpe-Ratio-for-Algorithmic-Trading-Performance-Measurement/)
- [The5ers - 5 Ratios Traders Need](https://the5ers.com/5-ratios-traders-need-to-be-on-the-lookout-for/)
- [OptionAlpha - Performance Metrics](https://optionalpha.com/learn/performance-metrics)
