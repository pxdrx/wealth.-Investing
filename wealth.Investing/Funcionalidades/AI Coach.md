---
tags: [feature, ai-coach, claude, streaming]
date: 2026-03-25
status: implementado
tier: pro
---

# AI Coach

## Visão Geral

Coach de trading com IA que analisa trades e fornece feedback personalizado via streaming SSE. Tier **Pro+** apenas.

## Status

- ✅ 100% implementado e deployed
- ⚠️ Aguarda créditos na API Anthropic (~\$5)
- Key válida, saldo zero

## Como Funciona

1. Usuário seleciona trade ou faz pergunta
2. Frontend envia POST para `/api/ai-coach`
3. API valida tier (Pro+ via SubscriptionContext)
4. Envia contexto do trade + histórico para Claude Haiku
5. Streaming SSE retorna resposta progressiva
6. Frontend renderiza em tempo real

## Design

- Card-container matching landing page mockup style
- Blur paywall para usuários Free
- Animação suave de entrada (Framer Motion)

Ver: [[AI Coach Architecture]], [[MVP Revenue Design]]

#feature #ai #coach


## Integração com Analista Dexter

O AI Coach busca as últimas 5 análises do [[Funcionalidades/Analista de Ativos|Analista Dexter]] e injeta no contexto da conversa. O user pode perguntar sobre análises anteriores, comparar ativos, ou pedir resumos.

Ver [[Funcionalidades/Analista de Ativos|Analista Dexter]] para detalhes.