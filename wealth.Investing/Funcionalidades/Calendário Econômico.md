---
tags: [feature, macro, calendário, forexfactory]
date: 2026-03-25
status: ativo
tier: free
---

# Calendário Econômico

## Visão Geral

Calendário de eventos econômicos acessível a **todos os tiers** (FREE incluído). Mostra eventos com impacto (low/medium/high), valores actual/previous/forecast, e hora local.

## Fonte de Dados

- **API:** ForexFactory via faireconomy JSON endpoint
- **Refresh:** A cada 30 minutos (cron)
- **Fallback:** Dados cacheados no Supabase (`economic_events` table)

## Schema

```sql
economic_events (
  id, title, country, date, time,
  impact (low/medium/high),
  actual, previous, forecast,
  created_at, updated_at
)
```

## UI

- Lista cronológica agrupada por dia
- Indicadores de impacto coloridos (🔴 high, 🟡 medium, ⚪ low)
- Destaque quando actual ≠ forecast (surpresa)
- Integrado no dashboard e na página macro

## Cron

Ver: [[Cron Jobs]] — `calendar-sync` a cada 30 minutos

Ver: [[Macro Intelligence]], [[Taxas de Juros]]

#feature #macro #calendário
