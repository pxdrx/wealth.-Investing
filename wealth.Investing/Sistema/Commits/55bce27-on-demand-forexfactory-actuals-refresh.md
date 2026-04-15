---
type: commit
sha: 55bce27282af460155d7aaf210e34390abfc81f8
sha7: 55bce27
date: "2026-04-15T01:56:27-03:00"
author: Pedro
commit_type: feat
scope: ai-coach
files_changed: 2
insertions: 113
deletions: 20
tags: ["feat", "ai-coach", "api", "lib"]
---

# feat(ai-coach): on-demand ForexFactory actuals refresh

> Commit por **Pedro** em 2026-04-15T01:56:27-03:00
> 2 arquivo(s) — +113 / −20

## Sessão

[[Sistema/Sessões/2026-04-15]]

## Arquivos tocados

- [[Sistema/Endpoints/app/api/ai/coach/route.ts|app/api/ai/coach/route.ts]]
- `lib/macro/ff-on-demand.ts` [[Sistema/Arquivos/lib/macro/ff-on-demand.ts|hub]]

## Mensagem

Quando o usuario faz uma pergunta ao Coach e existe evento high-impact da
semana que ja saiu (datetime ET passou) mas ainda esta com actual=null no
DB e foi liberado ha <4h, dispara scrape sincrono do ForexFactory antes de
montar o prompt. Reusa mergeTeActuals (FFCalendarEvent compativel com
TeCalendarRow nos campos usados). Timeout interno de 6s.

Resolve defasagem entre release e cron de calendar-sync (que so roda 2x/dia).
Agora Payroll/CPI/PPI aparecem com valor "Real" preenchido dentro de
minutos apos publicacao no ForexFactory, sem esperar o cron.
