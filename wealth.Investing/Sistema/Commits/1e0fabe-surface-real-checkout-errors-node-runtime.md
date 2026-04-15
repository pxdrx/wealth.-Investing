---
type: commit
sha: 1e0fabe5471c726c6693fd23ed6ff0f66e06b9c5
sha7: 1e0fabe
date: "2026-04-15T16:00:46-03:00"
author: Pedro
commit_type: fix
scope: billing
files_changed: 1
insertions: 44
deletions: 3
tags: ["fix", "billing", "api"]
---

# fix(billing): surface real checkout errors + node runtime

> Commit por **Pedro** em 2026-04-15T16:00:46-03:00
> 1 arquivo(s) — +44 / −3

## Sessão

[[Sistema/Sessões/2026-04-15]]

## Arquivos tocados

- [[Sistema/Endpoints/app/api/billing/checkout/route.ts|app/api/billing/checkout/route.ts]]

## Mensagem

Checkout was masking all failures as generic "Internal error". Now:
- Declare runtime=nodejs + force-dynamic.
- 503 when STRIPE_SECRET_KEY missing.
- 503 with debug payload when price env var unset.
- 502 on Stripe resource_missing (bad price ID).
- 500 with code/message on unknown errors (dev only).

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
