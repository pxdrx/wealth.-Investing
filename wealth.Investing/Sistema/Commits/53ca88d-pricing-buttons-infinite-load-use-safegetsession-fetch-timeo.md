---
type: commit
sha: 53ca88d74d1602276daa23cb0a7146235cc7b02b
sha7: 53ca88d
date: "2026-04-14T21:47:32-03:00"
author: Pedro
commit_type: fix
scope: billing
files_changed: 1
insertions: 25
deletions: 9
tags: ["fix", "billing", "ui"]
---

# fix(billing): pricing buttons infinite load — use safeGetSession + fetch timeout

> Commit por **Pedro** em 2026-04-14T21:47:32-03:00
> 1 arquivo(s) — +25 / −9

## Sessão

[[Sistema/Sessões/2026-04-14]]

## Arquivos tocados

- `components/billing/PricingCards.tsx` [[Sistema/Arquivos/components/billing/PricingCards.tsx|hub]]

## Mensagem

supabase.auth.getSession() pode travar indefinidamente (bug conhecido),
deixando o botão preso em "Redirecionando..." sem alert nem redirect.
Troca para safeGetSession (timeout 3s) e adiciona AbortController de 15s
na chamada /api/billing/checkout e /api/billing/portal.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
