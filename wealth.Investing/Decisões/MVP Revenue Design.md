---
tags: [decisão, pricing, stripe, revenue]
date: 2026-03-16
status: aprovado
---

# MVP Revenue Design

## Decisão

Implementar modelo freemium com 3 tiers e billing via Stripe (card + Pix).

## Tiers

| Tier | Preço | Features Principais |
|------|-------|---------------------|
| **Free** | R\$0 | Journal básico, 1 conta, calendário econômico |
| **Pro** | R\$79.90/mês | Multi-conta, AI Coach, macro completo, alertas |
| **Ultra** | R\$139.90/mês | Tudo do Pro + relatórios avançados, API access |

## Toggle Anual
- Desconto para pagamento anual
- Confetti animation ao selecionar (canvas-confetti)
- Number flow animation (@number-flow/react)

## Implementação

- `subscriptions` table no Supabase
- `SubscriptionContext` para acessar tier em qualquer componente
- `PaywallGate` component para blur + upgrade prompt
- Stripe Checkout para pagamento
- Stripe Customer Portal para gerenciamento
- Webhooks para sync de status

## Documentos Relacionados

- Design doc: `docs/design-mvp-revenue.md`
- Competitive intel: `ralph-claude-code/competitive-intelligence-trading-journal.md`
- Constraint review: `docs/constraint-guardian-review.md`

Ver: [[Billing Stripe]], [[Concorrentes]]

#decisão #pricing #stripe
