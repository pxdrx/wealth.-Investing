---
tags: [decisão, ai-coach, claude, streaming]
date: 2026-03-17
status: implementado
---

# AI Coach Architecture

## Decisão

Implementar AI Coach com streaming SSE usando Claude Haiku, tier-gated (Pro+).

## Arquitetura

```mermaid
sequenceDiagram
    participant C as Client
    participant API as /api/ai-coach
    participant CL as Claude API

    C->>API: POST (trade data + question)
    API->>API: Validar tier (Pro+)
    API->>CL: stream: true
    CL-->>API: SSE chunks
    API-->>C: SSE forward
    C->>C: Render progressivo
```

## Detalhes

- **Modelo:** Claude Haiku (custo-efetivo)
- **Streaming:** SSE (Server-Sent Events) para resposta progressiva
- **Tier gate:** PaywallGate blur para Free users
- **Context:** Envia dados do trade atual + histórico recente
- **Design:** Card-container matching landing page mockup style

## Status

✅ 100% implementado e deployed.
⚠️ Pendente: usuário precisa de créditos na API Anthropic (~\$5) — key válida, saldo zero.

Ver: [[AI Coach]], [[MVP Revenue Design]]

#decisão #ai #claude
