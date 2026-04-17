# Auditoria de Métricas do Journal — 2026-04-17

## Contexto

Plataforma comercial; qualquer métrica errada impacta a tese do trader sobre seu próprio desempenho. Auditoria forense de cada cálculo em `lib/trade-analytics.ts` e no consumo pelos componentes da aba Journal.

**Entradas auditadas:**
- `lib/trade-analytics.ts` (motor de cálculo, 480 linhas)
- `components/journal/JournalKpiCards.tsx` (KPI bar, 154 linhas)
- `components/journal/JournalReports.tsx` (breakdowns)
- Convenções de filtros: `getNetPnl(t)` retorna `net_pnl_usd` (já com fees)

**Convenções adotadas** (documentadas aqui para o produto):
- **Breakeven = não-win**: trades com `net_pnl_usd == 0` contam como derrota para Win Rate, mas antes desta auditoria também diluíam `avgLoss` (corrigido).
- **Win Rate denominator = total trades** (inclui breakeven), portanto mais conservador que plataformas que excluem breakeven.
- **Expectancy** = `netPnl / totalTrades` (Van Tharp; matematicamente igual a `P(win)·avgWin − P(loss)·avgLoss`).

---

## Tabela de achados

| # | Métrica | Arquivo:linha | Fórmula ANTES | Fórmula CORRETA (referência) | Status | Fix |
|---|---------|---------------|---------------|-------------------------------|--------|-----|
| 1 | Win Rate | `trade-analytics.ts:202` | `wins.length / totalTrades * 100` onde `wins = getNetPnl > 0` | Mesma. Convenção: breakeven → não-win. | ✅ OK | — |
| 2 | Win Rate (KPI) | `JournalKpiCards.tsx:44` | `wins.length / filtered.length * 100` | Igual à analytics. | ✅ OK | — |
| 3 | Profit Factor | `trade-analytics.ts:206` | `grossWin / grossLoss` com fallback `Infinity` quando `grossLoss=0` e `grossWin>0`, senão 0. | Correto. Edge case tratado. | ✅ OK | — |
| 4 | Avg Win | `trade-analytics.ts:208` | `grossWin / wins.length` | Correto. | ✅ OK | — |
| 5 | **Avg Loss (DILUÍDO)** | `trade-analytics.ts:209` | `grossLoss / losses.length` onde `losses = getNetPnl <= 0` inclui breakeven | `grossLoss / strictLosses.length` onde strictLoss = `getNetPnl < 0` | 🔴 BUG | Filtrar estritamente `< 0` para denominador de avg. |
| 6 | Payoff Ratio | `trade-analytics.ts:210` | `avgWin / avgLoss` | Correto em forma; herdava bug do #5. | 🟡 Herdado | Corrige junto com #5. |
| 7 | Avg RR | `trade-analytics.ts:219-223` | Média de `rr_realized` em trades com campo preenchido. | Correto. Exposto `tradesWithoutRR` para a UI explicar lacunas. | ✅ OK | — |
| 8 | **Expectancy (divergência)** | `trade-analytics.ts:226` vs `JournalKpiCards.tsx:47` | Analytics: `netPnl/totalTrades`. KpiCards: `winrate·avgWin − lossrate·avgLoss`. Matematicamente equivalentes, MAS KpiCards calculava localmente com `avgLoss` diluído (#5). | Adotar `netPnl/totalTrades` (Van Tharp); KpiCards passa a consumir de `computeTradeAnalytics`. | 🔴 Divergência | Unificar: KpiCards usa `analytics.expectancy`. |
| 9 | **Max Drawdown (negative-start)** | `trade-analytics.ts:266-283` | Peak inicializado com `equityCurve[0].equity` (pode ser negativo). Se curva começa negativa e fica negativa, retorna −100% forçado. | Peak inicializado em 0 (baseline do saldo depositado). DD só calcula após peak > 0. Expor `maxDrawdownUsd` (distância USD absoluta peak-to-trough) como fonte primária. | 🔴 BUG (UX) | Reescrever: peak=0, MDD em USD alinhado com MDD%. |
| 10 | Daily Std Dev | `trade-analytics.ts:253` | `sqrt(Σ(v−mean)² / (n−1))` (sample, n−1) | Correto. | ✅ OK | — |
| 11 | Sharpe Ratio | `trade-analytics.ts:297-299` | `((meanDaily − dailyRf)/dailyStdDev) * sqrt(252)` gated `tradingDays >= 20` | Correto. Ajuste anotado: limite 20 dias é LIBERAL. Convenção conservadora seria ≥60. Mantido 20 com aviso. | ✅ OK (doc) | Documentar gate. |
| 12 | Sortino Ratio | `trade-analytics.ts:309-311` | `(excessMean / downsideStd) * sqrt(252)` | Correto. | ✅ OK | — |
| 13 | Calmar Ratio | `trade-analytics.ts:322-327` | `annualReturnPct / maxDrawdown%` | Semanticamente correto. Herdará melhoria do #9. | 🟡 Herdado | — |
| 14 | Kelly Criterion | `trade-analytics.ts:329-335` | Half-Kelly capado em 0.5. | Correto. | ✅ OK | — |
| 15 | **Recovery Factor (circular)** | `trade-analytics.ts:337-341` | `netPnl / ((maxDrawdown%/100) * avgEquity)`. `avgEquity` = média dos ABS da equity. Base instável. | `netPnl / maxDrawdownUsd` direto, medido peak-to-trough na equity em USD. | 🔴 BUG | Usar `maxDrawdownUsd` direto (do fix #9). |
| 16 | Streaks | `trade-analytics.ts:119-138` | Itera ordenado por `closed_at`, conta sequências. Breakeven conta como loss (consistente com #1). | Correto. Edge cases (trade único, zero trades) ok. | ✅ OK | — |
| 17 | Best/Worst Day | `trade-analytics.ts:241-246` | `reduce` sobre `dailyPnl`. | Correto. | ✅ OK | — |
| 18 | Best/Worst Trade (KPI) | `JournalKpiCards.tsx:48-49` | `Math.max/min(...nets)` sobre período filtrado. | Correto. | ✅ OK | — |
| 19 | Equity Curve | `trade-analytics.ts:256-260` | Cumulativo diário a partir de 0. | Correto, mas baseline-zero amplifica bug #9 na UI. | 🟡 Herdado | — |
| 20 | By Symbol | `trade-analytics.ts:363-373` | `avgPnl = totalPnl / tradeCount`, winRate via helper. | Correto. | ✅ OK | — |
| 21 | By Direction | `trade-analytics.ts:375-385` | tradeCount, winRate, totalPnl. | Correto. | ✅ OK | — |
| 22 | By DayOfWeek | `trade-analytics.ts:387-409` | Separa wins/losses por dia, `netPnl = totalWinPnl + totalLossPnl` (losses já negativos). | Correto. | ✅ OK | — |
| 23 | By Session | `trade-analytics.ts:411-421` | Derivado de `getSession(utcHour)`. | Correto (janelas: Tokyo 0-8, London 8-14, NY 14-21). | ✅ OK | — |
| 24 | By Hour | `trade-analytics.ts:423-444` | Por `toLocalHour(opened_at, tz)`. | Correto (usa timezone). | ✅ OK | — |
| 25 | Avg Trade Duration | `trade-analytics.ts:347-354` | (close − open) em minutos, filtra negativos. | Correto. | ✅ OK | — |
| 26 | Trades Per Week | `trade-analytics.ts:356-360` | `totalTrades / max(weekSpan, 1)`. Clamp 1 semana mínimo. | Correto. | ✅ OK | — |
| 27 | P(win)·AW − P(loss)·AL ≡ netPnl/N | matemática | Prova: P(w)·AW = (w/N)·(gw/w) = gw/N; análogo para loss. Expectancy = (gw − gl)/N = netPnl/N. | Equivalência formal. Ambos precisam da MESMA base de cálculo. | ✅ OK | — |

**Legenda de status:**
- ✅ OK — fórmula correta, sem mudança necessária
- 🟡 Herdado — herda de outro bug; corrige em cascata
- 🔴 BUG — fix aplicado neste commit
- 🔴 Divergência — dois caminhos para a mesma métrica; unificado

---

## Fixes aplicados neste commit

### F1. Avg Loss estritamente negativo
**Onde:** `lib/trade-analytics.ts:208-210`
**Antes:**
```ts
const avgLoss = losses.length > 0 ? grossLoss / losses.length : 0;
```
**Depois:** denominador passa a usar só trades com `getNetPnl(t) < 0` (exclui breakeven). `grossLoss` continua sendo soma absoluta de todas perdas ≤ 0 (para consistência com Profit Factor) MAS a média divide por `strictLosses.length`.

### F2. Expectancy unificada
**Onde:** `components/journal/JournalKpiCards.tsx:38-64`
**Antes:** cálculo local com `winrate·avgWin − lossrate·avgLoss`, usando avgLoss diluído.
**Depois:** consome `analytics.expectancy` já calculado por `computeTradeAnalytics(filtered)`.

### F3. Max Drawdown baseline-zero
**Onde:** `lib/trade-analytics.ts:262-283`
**Antes:** `peak = equityCurve[0].equity` permitia peak negativo → artefato de −100% quando curva começava e permanecia negativa.
**Depois:**
- `peak = 0` (baseline do saldo inicial; equity curve parte de 0 cumulativo).
- MDD% calculado apenas após peak > 0; do contrário 0%.
- Novo campo `maxDrawdownUsd` exposto no retorno: distância USD peak-to-trough absoluta (calculada sempre, mesmo em curvas all-negative).

### F4. Recovery Factor direto em USD
**Onde:** `lib/trade-analytics.ts:337-341`
**Antes:** `maxDrawdownUsd = (maxDD%/100) * avgEquity` — circular.
**Depois:** usa o novo `maxDrawdownUsd` direto do F3.

---

## Sharpe / Sortino — não adicionar novas

Já existem (gates 20+ trading days). Decisão: não remover, não endurecer os gates agora. Adicionamos à UI apenas quando expomos em breakdowns. Documentado acima (#11–12).

---

## Cobertura de testes (adicionada neste commit)

`lib/__tests__/trade-analytics.test.ts` com casos manuais verificáveis por planilha:
1. **Win Rate** — 6 wins / 10 trades = 60%.
2. **Profit Factor** — grossWin=300, grossLoss=200 → 1.5; grossLoss=0 + grossWin>0 → Infinity.
3. **Expectancy** — valida que `netPnl/totalTrades` === `P(w)·AW − P(l)·AL`.
4. **Max Drawdown** — (a) curva positiva depois queda; (b) curva all-negative devolve 0% + USD absoluto.
5. **Streaks** — 1 trade, 2 consecutivos, alternados.
6. **Avg Loss sem diluição** — 2 losses reais de −100, 3 breakevens → avgLoss=100, não 40.

---

## Validação manual pendente (produção)

Após deploy:
- Abrir `/app/journal` com conta real e comparar 10 trades em planilha paralela:
  - Win Rate, Profit Factor, Expectancy, Max Drawdown devem bater.
- Caso a conta do usuário comece com perdas (primeiros dias), confirmar que Max Drawdown não mostra mais −100% artificial.

---

## Assinatura

Auditor: A3 (orquestrador) — 2026-04-17.
