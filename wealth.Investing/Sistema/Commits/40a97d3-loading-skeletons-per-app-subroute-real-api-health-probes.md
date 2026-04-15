---
type: commit
sha: 40a97d313f597cdbde9c0c150e5a33722172ef05
sha7: 40a97d3
date: "2026-04-15T02:57:03-03:00"
author: Pedro
commit_type: feat
scope: ux
files_changed: 12
insertions: 235
deletions: 5
tags: ["feat", "ux", "api", "route"]
---

# feat(ux): loading skeletons per app subroute + real /api/health probes

> Commit por **Pedro** em 2026-04-15T02:57:03-03:00
> 12 arquivo(s) — +235 / −5

## Sessão

[[Sistema/Sessões/2026-04-15]]

## Arquivos tocados

- [[Sistema/Endpoints/app/api/health/route.ts|app/api/health/route.ts]]
- `app/app/account/loading.tsx` [[Sistema/Arquivos/app/app/account/loading.tsx|hub]]
- `app/app/ai-coach/loading.tsx` [[Sistema/Arquivos/app/app/ai-coach/loading.tsx|hub]]
- `app/app/analyst/loading.tsx` [[Sistema/Arquivos/app/app/analyst/loading.tsx|hub]]
- `app/app/journal/loading.tsx` [[Sistema/Arquivos/app/app/journal/loading.tsx|hub]]
- `app/app/macro/loading.tsx` [[Sistema/Arquivos/app/app/macro/loading.tsx|hub]]
- `app/app/mentor/loading.tsx` [[Sistema/Arquivos/app/app/mentor/loading.tsx|hub]]
- `app/app/news/loading.tsx` [[Sistema/Arquivos/app/app/news/loading.tsx|hub]]
- `app/app/pricing/loading.tsx` [[Sistema/Arquivos/app/app/pricing/loading.tsx|hub]]
- `app/app/prop/loading.tsx` [[Sistema/Arquivos/app/app/prop/loading.tsx|hub]]
- `app/app/reports/loading.tsx` [[Sistema/Arquivos/app/app/reports/loading.tsx|hub]]
- `app/app/settings/loading.tsx` [[Sistema/Arquivos/app/app/settings/loading.tsx|hub]]

## Mensagem

Adds loading.tsx to 11 /app/app/* subroutes so soft-nav on slow connections
never shows a blank frame. /api/health now pings Redis and Supabase and
returns 503 when either is degraded so uptime monitors can alert.
