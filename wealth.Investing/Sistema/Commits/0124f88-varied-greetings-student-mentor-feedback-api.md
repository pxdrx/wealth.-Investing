---
type: commit
sha: 0124f88f54a329f714db4c066811b3516cdf0b20
sha7: 0124f88
date: "2026-04-15T16:01:13-03:00"
author: Pedro
commit_type: feat
scope: dashboard
files_changed: 3
insertions: 178
deletions: 18
tags: ["feat", "dashboard", "api", "route", "lib"]
---

# feat(dashboard): varied greetings + student mentor-feedback API

> Commit por **Pedro** em 2026-04-15T16:01:13-03:00
> 3 arquivo(s) — +178 / −18

## Sessão

[[Sistema/Sessões/2026-04-15]]

## Arquivos tocados

- [[Sistema/Endpoints/app/api/mentor/my-feedback/route.ts|app/api/mentor/my-feedback/route.ts]]
- [[Sistema/Rotas/app/app/page.tsx|app/app/page.tsx]]
- `lib/greetings.ts` [[Sistema/Arquivos/lib/greetings.ts|hub]]

## Mensagem

- lib/greetings.ts: deterministic per-day phrase pool (8 each) for greeting
  and subtitle, seeded by userId so the line is stable within a day.
- app/api/mentor/my-feedback: student-side GET endpoint reading own
  mentor_notes (RLS-scoped) and enriching with mentor display_name.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
