# FXReplay Custom Indicators - Research Summary

**Source:** https://custom-indicators.gitbook.io/custom-indicators-docs/start-here
**Date:** 2026-04-11

---

## 1. NOT Pine Script - It's "FXR Script"

**Critical finding:** FXReplay does NOT use Pine Script at all. Despite the `//@version=1` pragma in examples, FXR Script is a completely different language based on **JavaScript/TypeScript**, not TradingView's Pine Script.

- Scripts use `init` and `onTick` lifecycle methods (arrow functions)
- All code is plain JavaScript with platform-injected APIs
- The `ta` (ta-math) library provides technical indicators as JS functions operating on `number[]` arrays
- Date handling uses `moment.js` (exposed as `_moment`)
- No Pine Script syntax: no `var`, no `:=`, no `series` type, no `if/else` Pine-style blocks

## 2. Architecture / Structure

Every indicator has exactly two parts:

```javascript
//@version=1
init = () => {
    // Runs ONCE at load - setup inputs, config
    indicator({ onMainPanel: true, format: 'inherit' });
    input.int('Period', 14, 'period');
};

onTick = (length, _moment, _, ta, inputs) => {
    // Runs on EVERY tick/candle update
    const close = closeC(0);
    plot.line('SMA', ta.sma(closeArray, inputs.period).at(-1), color.blue);
};
```

### Available globals inside `onTick`:
- `length` - number of bars
- `_moment` - moment.js instance
- `ta` - ta-math library (technical analysis functions)
- `inputs` - user input values (keyed by id)
- Price functions: `high(index)`, `low(index)`, `closeC(index)`, `openC(index)`, `time(index)`, `volume(index)`
- Note: `close` and `open` are accessed via `closeC()` and `openC()` (not `close()`)

## 3. What's SUPPORTED

### Config API
- `indicator({ onMainPanel, format, precision })` - panel placement + number format
- Formats: `'inherit'`, `'price'`, `'percent'`, `'volume'`

### Input Types (declared in `init` only)
- `input.int(title, value, id?, min?, max?, step?, tooltip?, group?, inline?)`
- `input.float(...)` - decimal
- `input.bool(...)` - checkbox
- `input.color(...)` - color picker (returns RGBA object)
- `input.str(...)` - string / dropdown
- `input.session(...)` - session time range
- `input.textarea(...)` - multiline text
- `input.time(...)` - time picker
- `input.src(...)` - price source selector
- `input.timeframe(...)` - timeframe selector (NEW)

### Plot Types
- `plot.line(title, value, color, plottype?, histogramBase?, offset?, id?)` - main plotting
  - plottype: 0=line, 1=histogram, 3=cross, 4=area, 5=columns, 6=circles, 7=line w/breaks, 8=area w/breaks, 9=step line
- `plot.filledArea(id, objATitle, objBTitle, title, color, transparency?, visible?, type?)` - shaded areas between lines
- `plot.colorer(title, value, plotTargetTitle, colors, id?)` - conditional line coloring
- `plot.barColorer(title, value, colors, id?)` - candle/bar coloring
- `plot.shapes(title, value, text, color, textColor, plottype, location, size, offset?, transparency?, id?)` - markers/arrows/labels

### Shape Types for `plot.shapes`
- `shape_arrow_down`, `shape_arrow_up`, `shape_circle`, `shape_cross`, `shape_xcross`
- `shape_diamond`, `shape_flag`, `shape_square`
- `shape_label_down`, `shape_label_up`, `shape_triangle_down`, `shape_triangle_up`

### Color API
- Predefined: `color.red`, `color.green`, `color.blue`, `color.black`, `color.white`, `color.gray`, `color.silver`, `color.maroon`, `color.purple`, `color.fuchsia`, `color.lime`, `color.olive`, `color.yellow`, `color.navy`, `color.teal`, `color.aqua`
- Custom: `color.rgba(r, g, b, a)` returns `"rgba(...)"`
- Also `BaseColors.<name>` syntax

### Chart Drawing Tools (STABLE - no warning icon)
- **Lines & Rays:** `trendLine`, `rayLine`, `infoLine`, `extendedLine`, `trendAngle`, `horizontalLine`, `horizontalRay`, `verticalLine`, `crossLine`
- **Channels:** (available, sub-pages exist)
- **Pitchforks:** (available)
- **Fibonacci:** (available)
- **Gann:** (available)
- **Classic / Harmonic Patterns:** (available)
- Drawing tools accept `time` and `price` coordinates, with options objects for styling

### Chart Drawing Tools (WARNING/BETA - marked with warning icon)
- **Elliott Waves:** `elliottImpulseWave`, `elliottCorrection`, `elliottTriangleWave`, `elliottDoubleCombo`, `elliottTripleCombo`
- **Cycles & Time Lines**
- **Trading Tools:** `longPosition`, `shortPosition`, `forecast`, `barsPattern`, `ghostFeed`, `projection`, `anchoredVWAP`, `fixedRangeVolumeProfile`
- **Range Measurements**
- **Arrows**
- **Geometric Shapes**
- **Text / Annotations**

### Charting Library Constants
- `linestyle`: 0=solid, 1=dotted, 2=dashed, 3=large dashed, 4=sparse dotted
- `linewidth`: numeric values for line thickness

### ta-math Library (Technical Analysis)
All functions take `number[]` arrays and return `number[]` (full series).

**Volume / Accumulation:** `adl`, `cho`, `mfi`
**Volatility / Range:** `atr`, `stdev`, `bb` (returns `{upper, middle, lower}`), `bbp`
**Momentum / Trend:** `adx`, `ao`, `ac`, `cci`, `rsi`, `roc`, `kst`, `macd`, `stoch`, `williams`
**Moving Averages:** `sma`, `ema`, `dema`, `tema`, `wma`, `lwma`
**Other:** `zigzag` (returns `{peaks, valleys}`), `vbp`, `vwap`

### moment.js Library
- Full Moment.js 2.x API available as `_moment`
- Parsing, formatting, UTC, durations, locale support

### Multi-Timeframe (MTF) - BETA
- `mtf.timeframe(timeframe)` - declared in `init`
- `mtf.high(index, smooth)`, `mtf.low(index, smooth)`, `mtf.open(index, smooth)`, `mtf.close(index, smooth)`
- `mtf.volume(index, smooth)`, `mtf.time(index, smooth)`
- `mtf.ema(src, length, smooth)`, `mtf.sma(src, length, smooth)`
- `mtf.rsi(src, length, smooth)`, `mtf.atr(length, smooth)`
- Timeframe strings: `"1D"`, `"240"`, `"60"`, `"15"`, `"5"`
- Smooth parameter: `true` = interpolated, `false` = stepped (only updates on MTF candle close)
- **Still in BETA - may have malfunctions or inconsistencies**

## 4. What's NOT Supported (vs TradingView Pine Script)

Since FXR Script is a completely different language from Pine Script, the following TradingView features DO NOT EXIST:

### Pine Script language features that don't exist
- **No Pine Script syntax at all** - no `var`, no `:=`, no `series` type
- **No `indicator()` / `strategy()` Pine declarations** - uses `indicator({...})` with JS object
- **No `input.source()` / `input.timeframe()` Pine-style** - uses `input.src()` / `input.timeframe()` with different signatures
- **No `request.security()` / `request.security_lower_tf()`** - uses `mtf.*` API instead
- **No `color.new(color, transparency)`** - uses `color.rgba(r, g, b, a)` instead
- **No `display.status_line`** - not mentioned anywhere in the docs
- **No `table.*` functions** - tables are completely absent from the API
- **No `array.*` functions** - uses plain JavaScript arrays with native methods
- **No `map.*` functions** - uses plain JavaScript objects/Maps
- **No `matrix.*` functions** - not available
- **No `str.*` built-in functions** - uses JavaScript string methods
- **No `math.*` Pine functions** - uses JavaScript `Math.*`
- **No `ta.*` Pine namespace** - uses ta-math library with different signatures (takes arrays, not series)
- **No `bar_index`, `barstate.*`** - uses `length` parameter and index-based access
- **No `syminfo.*`** - symbol info namespace not documented
- **No `timeframe.*` namespace** - uses `input.timeframe()` or MTF API
- **No `strategy.*` functions** - no backtesting/strategy framework
- **No alerts / `alert()` / `alertcondition()`** - not available
- **No `label.new()`, `line.new()`, `box.new()`** - uses drawing API: `horizontalLine()`, `trendLine()`, `rectangle()`, etc.
- **No `plotchar()`, `plotarrow()`** - uses `plot.shapes()` instead
- **No `hline()`** - uses `horizontalLine()` from drawing tools
- **No `bgcolor()`** - not directly available; use `plot.barColorer()` for candle coloring
- **No `fill()` Pine function** - uses `plot.filledArea()` instead
- **No Pine Script libraries / `import`** - only ta-math and moment.js are available
- **No `switch` / `match` Pine statements** - uses JavaScript `switch`/ternary
- **No `for...in` Pine loops** - uses JavaScript `for`, `forEach`, etc.
- **No user-defined types (UDT)** - uses JavaScript objects
- **No `varip` keyword** - state management through JavaScript closures/module-level variables
- **No `log.*` functions** - no logging API documented

### Specific features asked about:
| Feature | TradingView Pine | FXR Script |
|---------|-----------------|------------|
| `table.*` | Full table API | **NOT AVAILABLE** |
| `array.*` | Pine arrays | Use JS native arrays |
| `color.new()` | `color.new(color, transp)` | `color.rgba(r,g,b,a)` |
| `display.status_line` | Controls status line display | **NOT AVAILABLE** |
| `display.data_window` | Controls data window | **NOT AVAILABLE** |
| Pine `series` type | Implicit series | Explicit `number[]` arrays |
| `request.security` | MTF data access | `mtf.*` API (BETA) |
| `strategy()` | Backtesting | **NOT AVAILABLE** |
| `alert()` | Alert system | **NOT AVAILABLE** |

## 5. Key Syntax Differences Summary

| Concept | TradingView Pine | FXR Script |
|---------|-----------------|------------|
| Language | Pine Script (custom) | JavaScript |
| Version pragma | `//@version=5` | `//@version=1` |
| Entry point | Top-level execution | `init()` + `onTick()` |
| Inputs | `input.int("Label", defval=14)` | `input.int('Label', 14, 'id')` |
| Close price | `close` or `close[1]` | `closeC(0)` or `closeC(1)` |
| Open price | `open` | `openC(0)` |
| High/Low | `high`, `low` | `high(0)`, `low(0)` |
| Previous bar | `close[1]` | `closeC(1)` |
| Indicator config | `indicator("Name", overlay=true)` | `indicator({onMainPanel:true, format:'inherit'})` |
| Plot line | `plot(value, "Title", color)` | `plot.line("Title", value, color)` |
| Filled area | `fill(p1, p2, color)` | `plot.filledArea(id, titleA, titleB, title, color)` |
| Bar coloring | `barcolor(cond ? green : red)` | `plot.barColorer(title, value, colors)` |
| Shape markers | `plotshape(cond, style=shape.triangleup)` | `plot.shapes(title, value, text, color, textColor, 'shape_triangle_up', loc, size)` |
| Colors | `color.new(color.red, 50)` | `color.rgba(255, 0, 0, 0.5)` |
| Horizontal line | `hline(level)` | `horizontalLine(time, price, options)` |
| SMA | `ta.sma(close, 14)` | `ta.sma(closeArray, 14).at(-1)` |
| RSI | `ta.rsi(close, 14)` | `ta.rsi(closeArray, 14).at(-1)` |
| Bollinger Bands | `ta.bb(close, 20, 2)` | `ta.bb(closeArray, 20, 2)` returns `{upper, middle, lower}` |
| MTF data | `request.security(sym, tf, expr)` | `mtf.timeframe(tf)` in init, `mtf.close(0, true)` in onTick |
| State/variables | `var myVar = 0` | Module-level `let myVar = 0` (JS closure) |

## 6. Migration Notes

If converting a TradingView Pine Script indicator to FXR Script:

1. **Rewrite entirely in JavaScript** - there is no automated conversion
2. **Accumulate price data in arrays** - FXR's `ta` functions need `number[]`, not Pine series. You must manually push values: `closeArray.push(closeC(0))`
3. **Replace all Pine built-ins** with the FXR equivalents listed above
4. **No tables** - if your indicator uses tables, that feature cannot be ported
5. **No status line display** - `display.status_line` has no equivalent
6. **No alerts** - alert conditions cannot be ported
7. **No strategy backtesting** - strategy scripts cannot be ported
8. **Drawing tools differ significantly** - FXR has its own rich drawing API (trendLine, rectangle, fibonacci, etc.) but the signatures are completely different from Pine's `line.new()`, `box.new()`, etc.
9. **Color transparency** - replace `color.new(color.red, 80)` with `color.rgba(255, 0, 0, 0.2)` (note: Pine uses 0-100 transparency where 100=invisible, FXR uses 0-1 alpha where 0=invisible)
