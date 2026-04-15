---
type: feature
tags: [feature, billing, stripe, pricing]
last_commit: 67144ff
last_updated: 2026-04-14
commits_count: 4
---

# Billing Stripe

> Checkout, portal, webhooks e pricing page. Tiers Free/Pro/Ultra.

## Mudanças no dia 14/04

- **Pricing visual unificado** entre `/pricing` (público) e `/app/pricing` + remoção do jargão "Sharpe" ([[Sistema/Commits/1635f55-unify-pricing-visual-across-pricing-public-and-app-pricing-r|1635f55]])
- **Fix: pricing buttons com infinite load** — substituído por `safeGetSession` + fetch timeout ([[Sistema/Commits/53ca88d-pricing-buttons-infinite-load-use-safegetsession-fetch-timeo|53ca88d]]). Root cause: `getSession()` bloqueava indefinidamente quando token expirado.
- **Links de preço unificados em `/pricing`** — landing antes enviava para `/app/pricing` gerando paywall confuso ([[Sistema/Commits/67144ff-unifica-links-de-precos-para-pricing|67144ff]])
- Página `/pricing` pública criada como parte do [[Sistema/Features/Landing Redesign V2]] ([[Sistema/Commits/bd8e005-split-pills-screenshot-center-trustbar-enrich-journal-bento-|bd8e005]])

## Relacionado

- [[Funcionalidades/Billing Stripe]]
- [[Decisões/MVP Revenue Design]]
- [[Sistema/Features/Landing Redesign V2]]
- [[Sistema/Features/Auth Flow]]
- [[Sistema/Sessões/2026-04-14]]
