---
tags: [decisão, macro, intelligence, calendar]
date: 2026-03-19
status: implementado
---

# Macro Intelligence

## Decisão

Substituir /app/news por plataforma completa de inteligência macro com 4 módulos.

## Módulos

### 1. Calendário Econômico (FREE)
- Fonte: ForexFactory via faireconomy JSON
- Refresh: 30 minutos
- Mostra actual/previous/forecast

### 2. Taxas de Juros (PRO)
- 10 bancos centrais
- Scrape do Trading Economics
- Smart update após reuniões

### 3. Headlines ao Vivo (PRO)
- ForexLive RSS + Google News + Trading Economics
- Tradução automática PT-BR
- Auto-poll 30 minutos

### 4. Briefing Macroeconômico (PRO)
- Claude Sonnet para narrativas (não Haiku)
- 4 cards de impacto por ativo
- Cascade: headlines → briefing
- Geração semanal

## Gating

| Módulo | Free | Pro | Ultra |
|--------|------|-----|-------|
| Calendário | ✅ | ✅ | ✅ |
| Taxas | Blur | ✅ | ✅ |
| Headlines | Blur | ✅ | ✅ |
| Briefing | Blur | ✅ | ✅ |

## Documentos

- Plan: `docs/superpowers/plans/2026-03-19-macro-intelligence.md`
- Spec: `docs/superpowers/specs/2026-03-19-macro-intelligence-design.md`
- Mockups: `mockup-macro-intelligence.html` (V1 chosen)

## Markets Cobertos

**Forex:** EUR/USD, GBP/USD, USD/JPY, AUD/USD, USD/CAD, USD/CHF, NZD/USD, GBP/JPY
**Índices:** S&P 500, Nasdaq, Dow Jones
**Commodities:** XAU/USD, WTI Oil, Natural Gas
**Crypto:** BTC/USD, ETH/USD

> [!info] Exclusões
> Sem USD/MXN, sem DAX — foco nos ativos que os usuários realmente operam.

Ver: [[Calendário Econômico]], [[Taxas de Juros]], [[Headlines ao Vivo]], [[Briefing Macroeconômico]]

#decisão #macro
