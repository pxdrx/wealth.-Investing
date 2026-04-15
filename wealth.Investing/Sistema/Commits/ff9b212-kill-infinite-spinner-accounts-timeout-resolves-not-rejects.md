---
type: commit
sha: ff9b212fff1052dc91af33c5f6e9b569bd3810c7
sha7: ff9b212
date: "2026-04-14T16:34:05-03:00"
author: Pedro
commit_type: fix
scope: loading
files_changed: 3
insertions: 21
deletions: 7
tags: ["fix", "loading", "route", "ui"]
---

# fix(loading): kill infinite spinner — accounts timeout resolves [] not rejects

> Commit por **Pedro** em 2026-04-14T16:34:05-03:00
> 3 arquivo(s) — +21 / −7

## Sessão

[[Sistema/Sessões/2026-04-14]]

## Arquivos tocados

- [[Sistema/Rotas/app/app/settings/page.tsx|app/app/settings/page.tsx]]
- `components/context/ActiveAccountContext.tsx` [[Sistema/Arquivos/components/context/ActiveAccountContext.tsx|hub]]
- `components/context/SubscriptionContext.tsx` [[Sistema/Arquivos/components/context/SubscriptionContext.tsx|hub]]

## Mensagem

ActiveAccountContext.tsx Promise.race rejected on 8s timeout, leaving accounts=[]
+ isLoading=false → pages stuck in ambiguous state. Now resolves [] so
applyAccounts always runs and pages render empty state instead of spinner.

Also: SubscriptionContext safety 3s→5s (Slow 3G flicker), settings convergent
safety net (7s no-op), [load-safety] warns for Sentry triage.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
