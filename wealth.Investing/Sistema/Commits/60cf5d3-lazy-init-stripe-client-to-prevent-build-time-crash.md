---
type: commit
sha: 60cf5d3a78ef91cb8447c86cc35448d2a57b4860
sha7: 60cf5d3
date: "2026-03-17T00:20:47-03:00"
author: Pedro
commit_type: fix
scope: 
files_changed: 4
insertions: 22
deletions: 15
tags: ["fix", "api", "lib"]
---

# fix: lazy-init Stripe client to prevent build-time crash

> Commit por **Pedro** em 2026-03-17T00:20:47-03:00
> 4 arquivo(s) — +22 / −15

## Sessão

[[Sistema/Sessões/2026-03-17]]

## Arquivos tocados

- [[Sistema/Endpoints/app/api/billing/checkout/route.ts|app/api/billing/checkout/route.ts]]
- [[Sistema/Endpoints/app/api/billing/portal/route.ts|app/api/billing/portal/route.ts]]
- [[Sistema/Endpoints/app/api/webhooks/stripe/route.ts|app/api/webhooks/stripe/route.ts]]
- `lib/stripe.ts` [[Sistema/Arquivos/lib/stripe.ts|hub]]
