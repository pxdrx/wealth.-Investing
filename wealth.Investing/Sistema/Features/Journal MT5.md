---
type: feature
tags: [feature, journal, mt5, import, dashboard]
last_commit: 89fa8d6
last_updated: 2026-04-14
commits_count: 7
---

# Journal MT5

> Import de trades MT5 (XLSX/HTML), dedup, trading-day alignment e widgets de performance.

## Mudanças no dia 14/04

### Correções de import MT5
- **Dedup resiliente via hash fallback** — quando `external_id` não vem no arquivo ([[Sistema/Commits/212df2f-resilient-dedup-via-hash-fallback|212df2f]])
- **DST-aware wall-time → UTC** — horário de Brasília/ET com fuso correto em transições ([[Sistema/Commits/bcdad12-dst-aware-wall-time-utc-conversion|bcdad12]])
- **`net_pnl_usd` handling** clarificado no import ([[Sistema/Commits/fe31920-clarify-net-pnl-usd-handling-on-import|fe31920]])

### Alinhamento trading-day
- **Grouping unificado em 17:00-ET** entre journal e dashboard ([[Sistema/Commits/89fa8d6-unify-trading-day-grouping-on-17-00-et|89fa8d6]]) — evita divergências entre widgets de Desempenho e Calendar
- **Desempenho widget alinhado ao calendar** + rename de modos ([[Sistema/Commits/0cd27d1-align-desempenho-widget-with-calendar-rename-modes|0cd27d1]])

### Suporte
- **Forex month helpers** ([[Sistema/Commits/6dc4829-forex-month-helpers|6dc4829]])
- **PerformanceCard**: remove opção "Todas" do seletor de conta ([[Sistema/Commits/9e7f0e2-remove-todas-from-performancecard-account-selector|9e7f0e2]])

## Relacionado

- [[Funcionalidades/Journal de Trades]]
- [[Sistema/Endpoints]] — `/api/journal/import-mt5`
- [[Sistema/Tabelas]] — `journal_trades`
- [[Sistema/Sessões/2026-04-14]]
