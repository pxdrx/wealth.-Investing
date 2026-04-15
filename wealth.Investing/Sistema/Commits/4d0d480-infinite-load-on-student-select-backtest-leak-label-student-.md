---
type: commit
sha: 4d0d480b704013410075ba4e6cc380efcbea77a8
sha7: 4d0d480
date: "2026-04-14T17:20:22-03:00"
author: Pedro
commit_type: fix
scope: mentor
files_changed: 4
insertions: 74
deletions: 12
tags: ["fix", "mentor", "api", "route", "lib"]
---

# fix(mentor): infinite load on student select + backtest leak + label student accounts

> Commit por **Pedro** em 2026-04-14T17:20:22-03:00
> 4 arquivo(s) — +74 / −12

## Sessão

[[Sistema/Sessões/2026-04-14]]

## Arquivos tocados

- [[Sistema/Endpoints/app/api/mentor/student/_studentId_/journal/route.ts|app/api/mentor/student/[studentId]/journal/route.ts]]
- [[Sistema/Rotas/app/app/mentor/page.tsx|app/app/mentor/page.tsx]]
- `lib/accounts.ts` [[Sistema/Arquivos/lib/accounts.ts|hub]]
- `lib/student-balance.ts` [[Sistema/Arquivos/lib/student-balance.ts|hub]]

## Mensagem

Three issues on /app/mentor:

1. Student select ficava em loading infinito até F5: apiFetch usava raw
   supabase.auth.getSession() (pode pendurar). Trocado por safeGetSession
   (3s safe timeout). Safety timeout dos 3 fetches (kpis/trades/notes)
   refatorado pra serem independentes em vez de chained.

2. Contas de backtest do aluno apareciam no painel mentor — são dados
   fictícios e devem ficar isoladas em /app/backtest. Filtros server-side
   adicionados em getStudentKpisByAccount, getStudentLastUsedAccount e
   /api/mentor/student/[id]/journal (.neq kind=backtest).

3. Card "contas" sem label: mentor podia se confundir achando que eram
   suas. Adicionado heading "Contas de {studentName}".

Helper excludeBacktest exportado em lib/accounts.ts pra defesa client-side
em novos componentes.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
