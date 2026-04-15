---
type: commit
sha: 21f724e8ec7bae4cb37a804738908b6dc62fffbd
sha7: 21f724e
date: "2026-04-14T14:14:07-03:00"
author: Pedro
commit_type: fix
scope: mentor
files_changed: 9
insertions: 101
deletions: 4
tags: ["fix", "mentor", "api", "route", "lib"]
---

# fix(mentor): gate routes/page to plan=mentor only — admin/pro/ultra now blocked from mentor panel

> Commit por **Pedro** em 2026-04-14T14:14:07-03:00
> 9 arquivo(s) — +101 / −4

## Sessão

[[Sistema/Sessões/2026-04-14]]

## Arquivos tocados

- [[Sistema/Endpoints/app/api/mentor/codes/route.ts|app/api/mentor/codes/route.ts]]
- [[Sistema/Endpoints/app/api/mentor/generate-code/route.ts|app/api/mentor/generate-code/route.ts]]
- [[Sistema/Endpoints/app/api/mentor/notes/_noteId_/route.ts|app/api/mentor/notes/[noteId]/route.ts]]
- [[Sistema/Endpoints/app/api/mentor/notes/route.ts|app/api/mentor/notes/route.ts]]
- [[Sistema/Endpoints/app/api/mentor/student/_studentId_/journal/route.ts|app/api/mentor/student/[studentId]/journal/route.ts]]
- [[Sistema/Endpoints/app/api/mentor/student/_studentId_/kpis/route.ts|app/api/mentor/student/[studentId]/kpis/route.ts]]
- [[Sistema/Endpoints/app/api/mentor/students/route.ts|app/api/mentor/students/route.ts]]
- [[Sistema/Rotas/app/app/mentor/page.tsx|app/app/mentor/page.tsx]]
- `lib/mentor-guard.ts` [[Sistema/Arquivos/lib/mentor-guard.ts|hub]]
