---
tags: [feature, ultra, ia, analyst, dexter]
status: implementado
date: 2026-03-25
priority: alta
---

# Analista Dexter

Feature **Ultra** exclusiva — analista financeiro com IA integrado ao [[Projeto/Overview|wealth.Investing]].

Clonado do [[Referências/Dexter|Dexter (open-source)]], adaptado para multi-ativo com APIs gratuitas.

## Como Funciona

1. User digita ticker ou nome do ativo (autocomplete com 50+ ativos)
2. Sistema detecta tipo via `detectAssetType()` — forex, crypto, stock, commodity, index
3. Coleta dados de múltiplas APIs em paralelo (respeitando rate limits)
4. Claude Haiku gera relatório estruturado com 5 seções
5. Relatório salvo no DB (`analyst_reports`) por perfil de usuário
6. [[Funcionalidades/AI Coach|AI Coach]] tem acesso às análises para cross-reference

## Seções da Análise

| Seção | Descrição | Fontes |
|-------|-----------|--------|
| Contexto Macro | Política monetária, eventos, geopolítica | Claude + [[Funcionalidades/Headlines ao Vivo|Headlines]] |
| Análise Técnica | RSI, MACD, SMA50, EMA20, tendência | [[Técnico/API Routes|Alpha Vantage API]] |
| Análise Fundamental | P/E, receita, margens, financials | Finnhub API |
| Sentimento | Notícias, recomendações, posicionamento | Finnhub News |
| Gestão de Risco | Volatilidade, correlações, cenários | Claude AI |

## Veredicto

Cada análise termina com:
- **Bias:** Bullish / Bearish / Neutro
- **Confiança:** Alta / Média / Baixa
- **Resumo:** 2-3 frases
- **Níveis Chave:** Suportes e resistências
- **Ideia de Trade:** Entry, SL, TP

## APIs Utilizadas (todas gratuitas)

| API | Custo | Cobre | Rate Limit |
|-----|-------|-------|------------|
| Alpha Vantage | Free | Ações + Forex + Indicadores técnicos | 25 req/dia, 1/seg |
| Finnhub | Free | Notícias + Fundamentals + Recomendações | 60 req/min |
| CoinGecko | Free | Cripto completo | 30 req/min |
| Claude Haiku | ~$0.03/análise | Geração do relatório | — |

## Validação de Ticker

Se o user digita um ticker inválido (ex: "EJRLSL"), o sistema:
1. Busca dados em todas as APIs
2. Se TODAS retornam null/vazio → rejeita antes de chamar Claude
3. Mostra erro: "Ticker não encontrado"
4. Zero custo com API Anthropic

## UI

- **Página:** `/app/analyst`
- **Background:** Animação CPU Architecture (circuitos SVG animados)
- **Autocomplete:** 50+ ativos mapeados (nome → ticker)
- **Histórico:** Últimas 20 análises salvas, cards clicáveis com delete
- **Paywall:** Ultra exclusivo via [[Decisões/MVP Revenue Design|PaywallGate]]

## Integração com AI Coach

O [[Funcionalidades/AI Coach|AI Coach]] busca as últimas 5 análises do Dexter e injeta no contexto. O user pode perguntar:
- "Resuma minhas análises recentes do Dexter"
- "O que o Dexter disse sobre EURUSD?"
- "Quais ativos estão bullish?"

## Arquivos

| Arquivo | Função |
|---------|--------|
| `lib/analyst/SOUL.md` | Personalidade do analista |
| `lib/analyst/types.ts` | Tipos + detectAssetType() |
| `lib/analyst/agent/analyst.ts` | Engine principal |
| `lib/analyst/tools/finance/alpha-vantage.ts` | Quotes + indicadores |
| `lib/analyst/tools/finance/finnhub.ts` | News + fundamentals |
| `lib/analyst/tools/finance/coingecko.ts` | Dados cripto |
| `app/api/analyst/run/route.ts` | SSE streaming endpoint |
| `app/api/analyst/history/route.ts` | CRUD do histórico |
| `app/app/analyst/page.tsx` | UI completa |
| `components/ui/cpu-architecture.tsx` | Animação de fundo |

## Links

- [[Referências/Dexter|Origem: Dexter (virattt)]]
- [[Funcionalidades/AI Coach|AI Coach — integração]]
- [[Decisões/MVP Revenue Design|Pricing — Feature Ultra R$89,90/mês]]
- [[Técnico/Supabase Schema|DB: analyst_reports]]
- [[Técnico/API Routes|API: /api/analyst/run]]
- [[Projeto/Roadmap|Roadmap do projeto]]
- [[Mercado/Ativos Monitorados|Ativos suportados]]
- [[Mercado/Bancos Centrais|Contexto macro]]
