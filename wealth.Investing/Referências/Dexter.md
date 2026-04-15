---
tags: [referencia, open-source, agent, ia]
status: referencia
date: 2026-03-25
---

# Dexter (Referência)

Agente autônomo de pesquisa financeira open-source por **virattt**.

**Repo:** github.com/virattt/dexter
**Instalado em:** `dexter/` (root do projeto)
**Status:** Referência — não usado diretamente em produção

## O que é

Dexter é um CLI agent que analisa ações americanas usando LangChain + múltiplas APIs. Possui:
- Agent core loop (async generator, max 10 iterações)
- Scratchpad (JSONL persistence)
- Skills system (YAML frontmatter + markdown)
- Memory (SQLite + embeddings)
- Multi-provider LLM (OpenAI, Anthropic, Google, etc.)
- Gateway WhatsApp (Baileys)

## Limitações

- **Só ações americanas** — sem forex, cripto, commodities
- **CLI only** — sem API server, não integra em web
- **Financial Datasets API** — fonte de dados paga
- **Complexo** — muitas dependências (LangChain, Ink/React, Playwright)

## O que Clonamos

O [[Funcionalidades/Analista de Ativos|Analista Dexter (wealth.Analyst)]] usa a **arquitetura** do Dexter mas com adaptações:

| Aspecto | Dexter Original | wealth.Analyst |
|---------|----------------|----------------|
| Ativos | Ações US only | Forex, cripto, commodities, índices, ações |
| APIs | Financial Datasets (paga) | Alpha Vantage + Finnhub + CoinGecko (grátis) |
| Interface | CLI (terminal) | Web (Next.js + SSE streaming) |
| LLM | Multi-provider | Claude Haiku (custo-efetivo) |
| Persistência | JSONL local | Supabase (`analyst_reports`) |
| Integração | Standalone | Integrado ao [[Funcionalidades/AI Coach|AI Coach]] |

## Arquitetura Clonada

```
Dexter                          wealth.Analyst
├── agent/agent.ts         →    lib/analyst/agent/analyst.ts
├── tools/finance/         →    lib/analyst/tools/finance/
├── skills/                →    lib/analyst/SOUL.md
├── SOUL.md                →    lib/analyst/SOUL.md
└── model/llm.ts           →    Anthropic SDK direto
```

## APIs Keys Configuradas

- `OPENAI_API_KEY` — no `dexter/.env`
- `ANTHROPIC_API_KEY` — no `dexter/.env`
- `FINANCIAL_DATASETS_API_KEY` — no `dexter/.env`
- `EXA_SEARCH_API_KEY` — no `dexter/.env`
- `TAVILY_API_KEY` — no `dexter/.env`

## Links

- [[Funcionalidades/Analista de Ativos|Analista Dexter — nossa implementação]]
- [[Técnico/API Routes|API Routes do projeto]]
- [[Projeto/Stack Técnico|Stack técnico]]
- [[Decisões/MVP Revenue Design|Pricing — Feature Ultra]]
- [[Mercado/Concorrentes|Análise competitiva]]
