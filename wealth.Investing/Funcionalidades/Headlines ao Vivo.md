---
tags: [feature, macro, headlines, rss]
date: 2026-03-25
status: ativo
tier: pro
---

# Headlines ao Vivo

## Visão Geral

Feed de notícias macro em tempo real, traduzidas para PT-BR, com auto-refresh. Tier **Pro+** apenas.

## Pipeline

1. **Fetch** — RSS feeds de ForexLive, Google News, Trading Economics
2. **Parse** — Extrair título, link, data, fonte
3. **Traduzir** — Tradução automática para PT-BR
4. **Persistir** — Salvar em `macro_headlines` table
5. **Servir** — API endpoint para frontend
6. **Cascade** — Alimentar [[Briefing Macroeconômico]]

## Schema

```sql
macro_headlines (
  id, title, title_pt, source, url,
  category, relevance_score,
  published_at, created_at
)
```

## Auto-poll

- Intervalo: 30 minutos
- Deduplicação por URL
- Apenas headlines das últimas 24h exibidas

## Fontes

Ver: [[Headlines Sources]] para detalhes de cada fonte e por que Financial Juice foi removido.

Ver: [[Macro Intelligence]], [[Briefing Macroeconômico]]

#feature #macro #headlines
