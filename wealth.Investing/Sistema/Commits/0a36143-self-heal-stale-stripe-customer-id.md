---
type: commit
sha: 0a36143e645a8362f5235cbcf550c0e1c50276d7
sha7: 0a36143
date: "2026-04-15T16:20:00-03:00"
author: Pedro
commit_type: fix
scope: billing
files_changed: 2
insertions: 40
deletions: 0
tags: ["fix", "billing", "api"]
---

# fix(billing): self-heal stale stripe_customer_id

> Commit por **Pedro** em 2026-04-15T16:20:00-03:00
> 2 arquivo(s) — +40 / −0

## Sessão

[[Sistema/Sessões/2026-04-15]]

## Arquivos tocados

- [[Sistema/Endpoints/app/api/billing/checkout/route.ts|app/api/billing/checkout/route.ts]]
- [[Sistema/Endpoints/app/api/billing/portal/route.ts|app/api/billing/portal/route.ts]]

## Mensagem

Checkout now retrieves existing customer first; on resource_missing or
deleted=true, clears the DB cache and creates fresh. Portal catches the
same error, clears the stale id, returns stale_customer code so the UI
can redirect to /app/pricing.

Root cause: customers created in Stripe test mode linger in DB after a
switch to live mode, then every billing call 404s.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
