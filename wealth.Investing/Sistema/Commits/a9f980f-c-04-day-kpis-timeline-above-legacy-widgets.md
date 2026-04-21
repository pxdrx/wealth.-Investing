---
type: commit
sha: a9f980fd6c0d6e143975865ef38b86ec5ad50514
sha7: a9f980f
date: "2026-04-20T09:48:08-03:00"
author: Pedro
commit_type: feat
scope: app
files_changed: 4
insertions: 747
deletions: 0
tags: ["feat", "app", "api", "route", "ui"]
---

# feat(app): [C-04] day KPIs + timeline above legacy widgets

> Commit por **Pedro** em 2026-04-20T09:48:08-03:00
> 4 arquivo(s) — +747 / −0

## Sessão

[[Sistema/Sessões/2026-04-20]]

## Arquivos tocados

- [[Sistema/Endpoints/app/api/dashboard/today-stats/route.ts|app/api/dashboard/today-stats/route.ts]]
- [[Sistema/Rotas/app/app/page.tsx|app/app/page.tsx]]
- `components/dashboard/DayKpis.tsx` [[Sistema/Arquivos/components/dashboard/DayKpis.tsx|hub]]
- `components/dashboard/DayTimeline.tsx` [[Sistema/Arquivos/components/dashboard/DayTimeline.tsx|hub]]

## Mensagem

- app/api/dashboard/today-stats/route.ts: GET endpoint, Bearer auth,
  IDOR guard (account_id must belong to user), Redis 60s cache keyed
  by user+account+date, BRT day bounds, mood precedence
  drifting > accelerated > flow > focused > calm
- components/dashboard/DayKpis.tsx: 3 cards (PnL w/ SVG sparkline,
  daily drawdown bar, mood chip), terminal-dark shell, tabular-nums,
  graceful fallback when no active account / no prop firm configured
- components/dashboard/DayTimeline.tsx: SVG timeline 08:00-22:00 BRT
  with session bands (Tokyo / Londres / NY), trade dots sized by |pnl|,
  mobile scroll-x, empty state w/ TODO(A-02) voice.ts copy
- app/app/page.tsx: inject <DayKpis /> + <DayTimeline /> below
  <TodayMatters /> and above <DataAccumulation /> (legacy widgets
  untouched — removal reserved for C-05)

Not gated by useEntitlements — visible on all plans.
TODOs: per-user timezone, macro event markers, voice.ts copy.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
