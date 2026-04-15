---
tags: [feature, journal, trades, mt5]
date: 2026-03-25
status: ativo
tier: free
---

# Journal de Trades

## Visão Geral

Journal completo para registrar, analisar e aprender com trades. Funcionalidade **core** disponível em todos os tiers.

## Funcionalidades

### Entrada Manual
- Symbol, direction (long/short), entry/exit price
- PnL USD, net PnL USD
- Tags personalizadas
- Notas de psicologia
- Screenshot do gráfico

### Import MT5
- Formatos: XLSX e HTML
- Endpoint: `/api/journal/import-mt5`
- Autenticação: Bearer token
- Deduplicação: `user_id + account_id + external_source + external_id`
- Parsing: XLSX lib + Cheerio (HTML)

### Day Notes
- Notas diárias sobre o estado mental, market bias
- Vinculadas ao calendário

## Schema

```sql
journal_trades (
  id, account_id, user_id,
  symbol, direction, pnl_usd, net_pnl_usd,
  entry_price, exit_price, entry_time, exit_time,
  lots, tags, notes, psychology_notes,
  external_source, external_id,
  created_at, updated_at
)

day_notes (
  id, user_id, date,
  content, mood,
  created_at
)
```

## Multi-conta

Trades são vinculados a `account_id`. Usuário pode alternar entre contas via `ActiveAccountContext`.

Ver: [[Auth Flow]], [[Supabase Schema]]

#feature #journal #trades
