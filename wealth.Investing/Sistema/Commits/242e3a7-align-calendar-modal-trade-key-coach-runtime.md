---
type: commit
sha: 242e3a754a7dd143b5f533c436e712e3e0f44600
sha7: 242e3a7
date: "2026-04-15T15:20:11-03:00"
author: Pedro
commit_type: fix
scope: launch
files_changed: 2
insertions: 13
deletions: 9
tags: ["fix", "launch", "api", "ui"]
---

# fix(launch): align calendar/modal trade key + coach runtime

> Commit por **Pedro** em 2026-04-15T15:20:11-03:00
> 2 arquivo(s) — +13 / −9

## Sessão

[[Sistema/Sessões/2026-04-15]]

## Arquivos tocados

- [[Sistema/Endpoints/app/api/ai/coach/route.ts|app/api/ai/coach/route.ts]]
- `components/journal/DayDetailModal.tsx` [[Sistema/Arquivos/components/journal/DayDetailModal.tsx|hub]]

## Mensagem

- DayDetailModal: use opened_at as canonical forex-day key (matches
  PnlCalendar aggregation). Overnight/weekend trades no longer show
  mismatched counts between calendar badge and expanded modal.
- api/ai/coach: declare nodejs runtime, force-dynamic, maxDuration=60
  so streaming SSE has wall-clock headroom on Vercel.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
