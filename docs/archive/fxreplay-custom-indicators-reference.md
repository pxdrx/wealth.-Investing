# FXReplay Custom Indicators - Complete API Reference & Working Code Examples

Extracted 2026-04-11 from https://custom-indicators.gitbook.io/custom-indicators-docs/

---

## 1. INDICATOR LIFECYCLE

### init — Runs ONCE when indicator loads

```js
init = () => {
    // one-time setup logic here
    // - indicator() config
    // - input.* declarations
    // - band.line declarations
}
```

### onTick — Runs EVERY TIME a new candle/tick is received

```js
onTick = (length, _moment, _, ta, inputs) => {
    // per-tick or per-bar logic here
}
```

**Parameters:**
- `length` — number of bars
- `_moment` — Moment.js instance (alias of `moment`)
- `_` — unused placeholder
- `ta` — ta-math library namespace (RSI, SMA, BB, etc.)
- `inputs` — object with user input values keyed by their `id`

**CRITICAL:** onTick is called "every time the market updates (each tick)" per the docs.
The comment in the MTF example says: "It is called every time a new candle is received."
In practice it runs per-bar when replaying. Plot calls inside onTick plot the value for the CURRENT bar.

---

## 2. PRICE FUNCTIONS (Global, no namespace)

These are called directly — NO prefix needed. Index 0 = current bar, 1 = previous bar, etc.

| Function | Returns |
|----------|---------|
| `closeC(n)` | Close price of bar n |
| `openC(n)` | Open price of bar n |
| `high(n)` | High price of bar n |
| `low(n)` | Low price of bar n |
| `time(n)` | Time of bar n |

**What does `time(n)` return?**
- The docs use it with `_moment.utc(1632596400000)` (milliseconds) and with `rectangle(time(2), ...)` and `horizontalLine(time(0), price, ...)`.
- The `_moment.unix()` function takes seconds. `_moment.utc()` takes milliseconds.
- Based on the MTF example using `rectangle(mtf.time(2), mtf.high(2), mtf.time(0), mtf.low(0), ...)`, `time(n)` returns a **timestamp used by the charting library** (likely **seconds** since epoch, as TradingView's lightweight-charts uses seconds).

---

## 3. indicator() — Config API

Called inside `init`. Sets panel placement and format.

```js
indicator({ onMainPanel: true, format: 'inherit' })
indicator({ onMainPanel: false, format: 'inherit' })
indicator({ onMainPanel: true, format: 'price', precision: 5 })
indicator({ onMainPanel: false, format: 'percent', precision: 2 })
```

**Parameters:**
- `onMainPanel` (boolean) — `true` = overlay on price chart, `false` = separate panel below
- `format` — `'inherit'` | `'price'` | `'percent'` | `'volume'`
- `precision` (number) — required if format is not `'inherit'`

---

## 4. PLOT API

### 4a. plot.line — The most important one

**Syntax:**
```
plot.line(title, value, color, plottype?, histogramBase?, offset?, id?)
```

**Parameters:**
- `title` (string) — Name shown in legend
- `value` (number) — The number to plot for THIS bar
- `color` (string) — Line color like `color.red`, `'#FFA500'`, or `color.rgba(r,g,b,a)`
- `plottype` (number, optional) — Drawing style:
  - `0` = line (default)
  - `1` = histogram
  - `3` = cross
  - `4` = area
  - `5` = columns
  - `6` = circles
  - `7` = line with breaks
  - `8` = area with breaks
  - `9` = step line
- `histogramBase` (number, optional) — Baseline for histogram
- `offset` (number, optional) — Shifts plot forward/backward in time
- `id` (string, optional) — Custom identifier

**WORKING EXAMPLE — plot.line basics:**
```js
//@version=1
init = () => {
  // Show the indicator in the main panel
  indicator({ onMainPanel: true, format: 'inherit' });
};

onTick = () => {
  // 1) Calculate some simple values to plot
  const cierre = closeC(0);              // closing price of the current candle
  const hl2 = (high(0) + low(0)) / 2;    // average (high+low)/2 of the current candle

  // 2) Plot a line of the CLOSING PRICE
  //    plot.line(title, value, color, plottype?, id?)
  //    - title: name the user will see in the legend
  //    - value: number to plot for THIS candle
  //    - color: line color
  //    - plottype: (optional) line style (0 by default)
  //    - histogramBase : (optional) Baseline used when plottype is a histogram (0 by default)
  //    - offset : (optional) Shifts the plot (0 by default)
  //    - id: (optional) unique identifier; if not passed, it is derived from the title
  plot.line("Close", cierre, color.blue, 0);

  // 3) Plot another line (HL2) with a custom id to avoid collisions
  plot.line("Current HL2", hl2, color.gray, 0, 0, 1, "hl2_actual");

  // 4) Plot the High of the candle
  plot.line("High", high(0), color.green, 0);
};
```

**KEY INSIGHT:** `plot.line` is called INSIDE `onTick`. Each call plots ONE value for the CURRENT bar. The platform connects the dots across bars to form a continuous line.

### How to plot a HORIZONTAL line at a constant price:

**Option A — Using `band.line` (in init, for fixed levels):**
```js
band.line('Level 80', 80, '#787B86', 2, 1);
band.line('Level 30', 30, '#787B86', 2, 1);
```
Syntax: `band.line(title, value, color, lineWidth, lineStyle)`

**Option B — Using `plot.line` with a constant (in onTick):**
```js
onTick = () => {
  plot.line("My Level", 1.3000, color.red, 0);
};
```
This plots the same value every bar = horizontal line.

**Option C — Using `horizontalLine` drawing tool (in onTick):**
```js
horizontalLine(time(0), 1.3000, {
  linecolor: color.red,
  linewidth: 2,
  linestyle: 0,
  showLabel: true,
  textcolor: color.red
}, "Key Level");
```
Syntax: `horizontalLine(time, price, styles?, text?)`

---

### 4b. plot.filledArea

Fills space between two existing plot.line series.

**Syntax:**
```
plot.filledArea(id, objATitle, objBTitle, title, color, transparency?, visible?, type?)
```

- `type`: `"plot_plot"` (between two plot.lines) or `"hline_hline"` (between band.lines)

**WORKING EXAMPLE (from Bollinger Bands):**
```js
plot.filledArea('band1', 'Upper Band', 'SMA', 'Band 1', '#0000FF', 60, true, "plot_plot");
plot.filledArea('band2', 'SMA', 'Lower Band', 'Band 2', color.red, 60, true, "plot_plot");
```

---

### 4c. plot.colorer

Changes a line's color dynamically per bar.

**Syntax:**
```
plot.colorer(title, value, plotTargetTitle, colors, id?)
```

**WORKING EXAMPLE:**
```js
//@version=1
init = () => {
    indicator({ onMainPanel: false, format: 'inherit' });
};

const closeSeries = [];

onTick = (length, _moment, _, ta) => {
    const close = closeC(0);
    closeSeries.push(close);
    if (closeSeries.length < 20) return;

    // Calculate a 20-period SMA
    const smaArray = ta.sma(closeSeries, 20);
    const sma = smaArray.at(-1);

    // Draw the SMA line (this is the target we will color later)
    plot.line("SMA20", sma, "#AAAAAA");

    // Choose the palette index
    const paletteIndex = close > sma ? 0 : 1;

    // Apply the colorer to the target line "SMA20"
    plot.colorer("SMA20 Colorer", paletteIndex, "SMA20", [
        { name: "Price Above", color: "green" },
        { name: "Price Below", color: "red" }
    ]);
};
```

---

### 4d. plot.barColorer

Colors candlesticks themselves.

**Syntax:**
```
plot.barColorer(title, value, colors, id?)
```

**WORKING EXAMPLE:**
```js
//@version=1
init = () => {
  indicator({ onMainPanel: true, format: 'inherit' });
};

onTick = () => {
  // IMPORTANT: barColorer maps palette entries starting at index 1 internally.
  // If close > open -> use 1 (Bull), else use 2 (Bear).
  const idx = closeC(0) > openC(0) ? 1 : 2;

  // Color the current bar using the chosen palette index
  plot.barColorer("Trend Bars", idx, [
    { name: "Bull", color: "green" },
    { name: "Bear", color: "red" }
  ]);
};
```

---

### 4e. plot.shapes

Places markers/arrows on the chart.

**Syntax:**
```
plot.shapes(title, value, text, color, textColor, plottype, location, size, offset?, transparency?, id?)
```

**plottype values:** `shape_arrow_down`, `shape_arrow_up`, `shape_circle`, `shape_cross`, `shape_xcross`, `shape_diamond`, `shape_flag`, `shape_square`, `shape_label_down`, `shape_label_up`, `shape_triangle_down`, `shape_triangle_up`

**location values:** `AboveBar`, `BelowBar`, `Top`, `Bottom`, `Right`, `Left`, `Absolute`, `AbsoluteUp`, `AbsoluteDown`

**size values:** `auto`, `tiny`, `small`, `normal`, `large`, `huge`

---

## 5. DRAWING TOOLS

### horizontalLine
```
horizontalLine(time, price, styles?, text?)
```
- `time` — candle time (use `time(0)` for current)
- `price` — price level
- `styles` — `{ linecolor, linewidth, linestyle, showLabel, textcolor }`
- `text` — label text (requires `showLabel: true`)

### rectangle
```
rectangle(time1, price1, time2, price2, options?)
```
Options: `{ backgroundColor, color, extendRight }`

---

## 6. INPUT API (inside init only)

```js
input.int('Period', 20, 'period');                    // integer
input.float('Multiplier', 2.0, 'mult');               // decimal
input.bool('Show Draws', true, 'show');               // checkbox
input.color('Line Color', '#FF0000', 'lineColor');    // color picker
input.str('Label', 'default', 'label');               // text
input.src('Price Source', 'close', 'price_source');   // dropdown: open/high/low/close/hl2/hlc3/ohlc4
input.timeframe("TimeFrame", "4h");                   // timeframe selector
```

**Reading inputs in onTick:**
```js
onTick = (length, _moment, _, ta, inputs) => {
    const period = inputs.period;      // reads the 'period' input
    const show = inputs.show;          // reads the 'show' input
    const sel = inputs.price_source;   // returns a FUNCTION: call sel(0) to get current bar value
};
```

**IMPORTANT about `input.src`:** The returned value in `inputs` is a FUNCTION, not a number. Call it: `sel(0)` for current bar, `sel(1)` for previous, etc.

---

## 7. COLOR API

**Predefined:** `color.red`, `color.green`, `color.blue`, `color.black`, `color.white`, `color.gray`, `color.silver`, `color.maroon`, `color.purple`, `color.fuchsia`, `color.lime`, `color.olive`, `color.yellow`, `color.navy`, `color.teal`, `color.aqua`

**Custom:** `color.rgba(r, g, b, a)` — returns an rgba string

**Hex strings also work:** `'#FFA500'`, `'#00FF00'`, etc.

---

## 8. ta-math LIBRARY (via `ta` parameter)

All functions take plain `number[]` arrays and return `number[]` arrays.
Use `.at(-1)` to get the latest value.

```js
ta.sma(closeSeries, 20)        // Simple Moving Average
ta.ema(closeSeries, 20)        // Exponential Moving Average
ta.rsi(closeSeries, 14)        // RSI
ta.bb(closeSeries, 15, 2)      // Bollinger Bands -> { upper: [], middle: [], lower: [] }
ta.atr(highArr, lowArr, closeArr, 14)  // ATR
ta.adx(highArr, lowArr, closeArr, 14)  // ADX
ta.stdev(closeSeries, 15)      // Standard Deviation
ta.macd(closeSeries)           // MACD
ta.cci(highArr, lowArr, closeArr, 20)  // CCI
```

---

## 9. COMPLETE WORKING EXAMPLES

### Example 1: Bollinger Bands

```js
//@version=1
init = () => {
  indicator({ onMainPanel: true, format: 'inherit' });
  input.int('Period', 20, 'period');
};

const closeArray = [];

const calculateSMA = (values, period) => {
  if (values.length < period) return null;
  const sum = values.slice(-period).reduce((a, b) => a + b, 0);
  return sum / period;
};

const calculateStdDev = (values, period, mean) => {
  if (values.length < period) return null;
  const slice = values.slice(-period);
  const variance = slice.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / period;
  return Math.sqrt(variance);
};

onTick = (length, _moment, _, ta, inputs) => {
  const period = inputs.period;

  const close = closeC(0);
  closeArray.push(close);

  if (closeArray.length >= period) {
    const sma = calculateSMA(closeArray, period);
    const stdDev = calculateStdDev(closeArray, period, sma);

    const upperBand = sma + 2 * stdDev;
    const lowerBand = sma - 2 * stdDev;

    plot.line('SMA', sma, '#FFA500', 0);
    plot.line('Upper Band', upperBand, '#00FF00', 0);
    plot.line('Lower Band', lowerBand, '#FF0000', 0);
    plot.filledArea('band1', 'Upper Band', 'SMA', 'Band 1', '#0000FF', 60, true, "plot_plot");
    plot.filledArea('band2', 'SMA', 'Lower Band', 'Band 2', color.red, 60, true, "plot_plot");
  }
};
```

### Example 2: Multi-Timeframe FVG Detector

```js
//@version=1
init = () => {
    input.bool('show draws', true, 'show');
    input.bool('extend fvg', true, 'extend');
    let tm = input.timeframe("TimeFrame", "4h");
    mtf.timeframe(tm);
};

onTick = (length, _moment, _, ta, inputs) => {
    const show = inputs.show;
    const extend = inputs.extend;

    if (show) {
        if (
            mtf.high(2) < mtf.low(0) &&
            mtf.low(0) - mtf.high(2) > (mtf.closeC(1) - mtf.openC(1)) * 0.65
        ) {
            rectangle(mtf.time(2), mtf.high(2), mtf.time(0), mtf.low(0), {
                backgroundColor: color.rgba(0, 128, 0, 0.2),
                color: color.green,
                extendRight: extend,
            });
        }
    }
};
```

### Example 3: Trend Follower (Heikin Ashi RSI with Colorer)

```js
//@version=1
init = () => {
  indicator({ onMainPanel: false, format: 'inherit' });
  input.int('RSI Period', 21, 'rsiPeriod');
  input.int('SMA Period', 6, 'smaPeriod');

  band.line('Level 80', 80, '#787B86', 2, 1);
  band.line('Level 30', 30, '#787B86', 2, 1);
};

const haOpenSeries = [];
const haCloseSeries = [];
const haHighSeries = [];
const haLowSeries = [];
const haOhlc4Series = [];
const haOhlc4maSeries = [];
const haOhlc4maRsiSeries = [];

onTick = (length, _moment, _, ta, inputs) => {
  const rsiPeriod = inputs.rsiPeriod;
  const smaPeriod = inputs.smaPeriod;

  const open = openC(0);
  const highCandle = high(0);
  const lowCandle = low(0);
  const close = closeC(0);

  if ([open, highCandle, lowCandle, close].some(v => isNaN(v))) {
    return;
  }

  // Heikin Ashi Open
  const prevHaOpen = haOpenSeries.at(-1);
  const prevHaClose = haCloseSeries.at(-1);

  let haOpen;
  if (prevHaOpen !== undefined && prevHaClose !== undefined) {
    haOpen = (prevHaOpen + prevHaClose) / 2;
  } else {
    haOpen = (open + close) / 2;
  }

  if (isNaN(haOpen)) {
    return;
  }

  const haClose = (open + highCandle + lowCandle + close) / 4;
  const haHigh = Math.max(highCandle, haOpen, haClose);
  const haLow = Math.min(lowCandle, haOpen, haClose);
  const haOhlc4 = (haOpen + haHigh + haLow + haClose) / 4;

  if ([haClose, haHigh, haLow, haOhlc4].some(v => isNaN(v))) {
    return;
  }

  haOpenSeries.push(haOpen);
  haCloseSeries.push(haClose);
  haHighSeries.push(haHigh);
  haLowSeries.push(haLow);
  haOhlc4Series.push(haOhlc4);

  // SMA of Heikin Ashi OHLC4
  const smaArray = ta.sma(haOhlc4Series, smaPeriod);
  const haOhlc4SMA = smaArray.at(-1);

  if (isNaN(haOhlc4SMA)) {
    return;
  }

  haOhlc4maSeries.push(haOhlc4SMA);

  // RSI of SMA
  const rsiArray = ta.rsi(haOhlc4maSeries, rsiPeriod);
  const haOhlc4SmaRSI = rsiArray.at(-1);

  if (isNaN(haOhlc4SmaRSI)) {
    return;
  }

  haOhlc4maRsiSeries.push(haOhlc4SmaRSI);

  plot.line('Heikin Ashi SMA RSI', haOhlc4SmaRSI, '#FFFFFF', 0);

  let paletteIndex = 6; // default: white
  if (haOhlc4SmaRSI >= 90)      paletteIndex = 0;
  else if (haOhlc4SmaRSI >= 80) paletteIndex = 1;
  else if (haOhlc4SmaRSI >= 70) paletteIndex = 2;
  else if (haOhlc4SmaRSI < 10)  paletteIndex = 3;
  else if (haOhlc4SmaRSI < 20)  paletteIndex = 4;
  else if (haOhlc4SmaRSI < 30)  paletteIndex = 5;

  plot.colorer(
    'HA RSI Color',
    paletteIndex,
    'Heikin Ashi SMA RSI',
    [
      { name: '>=90', color: 'red' },
      { name: '>=80', color: 'orange' },
      { name: '>=70', color: 'yellow' },
      { name: '<10', color: 'green' },
      { name: '<20', color: 'lime' },
      { name: '<30', color: 'teal' },
      { name: 'Neutral', color: 'white' },
    ]
  );
};
```

### Example 4: Colorer (SMA color by trend)

```js
//@version=1
init = () => {
    indicator({ onMainPanel: false, format: 'inherit' });
};

const closeSeries = [];

onTick = (length, _moment, _, ta) => {
    const close = closeC(0);
    closeSeries.push(close);
    if (closeSeries.length < 20) return;

    const smaArray = ta.sma(closeSeries, 20);
    const sma = smaArray.at(-1);

    plot.line("SMA20", sma, "#AAAAAA");

    const paletteIndex = close > sma ? 0 : 1;

    plot.colorer("SMA20 Colorer", paletteIndex, "SMA20", [
        { name: "Price Above", color: "green" },
        { name: "Price Below", color: "red" }
    ]);
};
```

### Example 5: barColorer (candle coloring)

```js
//@version=1
init = () => {
  indicator({ onMainPanel: true, format: 'inherit' });
};

onTick = () => {
  // barColorer maps palette entries starting at index 1 internally
  const idx = closeC(0) > openC(0) ? 1 : 2;

  plot.barColorer("Trend Bars", idx, [
    { name: "Bull", color: "green" },
    { name: "Bear", color: "red" }
  ]);
};
```

### Example 6: FVG detector (current timeframe, from onTick docs)

```js
onTick = (length, _moment, _, ta, inputs) => {
    const show = inputs.show;
    const extend = inputs.extend;
    if (show) {
        if (high(2) < low(0) && (low(0) - high(2) > (closeC(1) - openC(1)) * 0.65)) {
            rectangle(time(2), high(2), time(0), low(0), {
                backgroundColor: color.rgba(0, 128, 0, 0.2),
                color: color.green,
                extendRight: extend
            });
        }
    }
};
```

### Example 7: Source input with plot.line

```js
//@version=1
init = () => {
  indicator({ onMainPanel: true, format: 'inherit' });
  input.src(
    "Price Source",
    "close",
    "price_source",
    "Inputs",
    "Choose which price feeds the plot",
    "row1"
  );
};

onTick = (length, _moment, _, ta, inputs) => {
    const sel = inputs.price_source; // This is a FUNCTION
    plot.line("Selected Source", sel(0), color.blue);
};
```

---

## 10. COMMON PATTERNS & GOTCHAS

### Pattern: Accumulating series for ta functions
```js
const closeSeries = [];  // declared OUTSIDE onTick (persists between calls)

onTick = (length, _moment, _, ta, inputs) => {
    closeSeries.push(closeC(0));            // push current bar's close
    if (closeSeries.length < 20) return;    // wait for enough data
    const sma = ta.sma(closeSeries, 20).at(-1);  // get latest value
    plot.line("SMA", sma, color.blue);
};
```

### Pattern: Guard against NaN
```js
if ([open, high, low, close].some(v => isNaN(v))) return;
```

### Pattern: Plotting a constant horizontal level
```js
// In init (preferred for fixed levels like RSI 80/30):
band.line('Level 80', 80, '#787B86', 2, 1);

// In onTick (for dynamic levels):
plot.line("Support", 1.30000, color.red, 0);
```

### GOTCHAS:
1. **`plot.line` must be called EVERY tick** — if you skip it (via early return), there will be a gap/break in the line
2. **Variable names matter** — `closeC(0)` not `close(0)`. `openC(0)` not `open(0)`. But `high(0)` and `low(0)` are as-is.
3. **Arrays persist between ticks** — declare them outside `onTick` at module level
4. **ta functions return arrays** — always use `.at(-1)` for the latest value
5. **input.src returns a function** — call `sel(0)` not just `sel`
6. **band.line goes in init** — it draws a fixed horizontal line on a separate-panel indicator
7. **indicator() must be called in init** — without it the indicator may not display
8. **plot.line with same title overwrites** — use unique titles or explicit `id` parameter
9. **barColorer palette is 1-indexed internally** — pass 1 or 2, not 0 or 1
