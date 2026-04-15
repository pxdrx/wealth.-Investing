---
type: commit
sha: 1088ad8c91a0416180792794f513aa0c09ac674f
sha7: 1088ad8
date: "2026-04-13T16:39:10-03:00"
author: Pedro
commit_type: fix
scope: 
files_changed: 11
insertions: 149
deletions: 29
tags: ["fix", "api", "route", "ui", "lib"]
---

# fix: RLS bypass for cross-user mentor queries, settings loading, email on plan change

> Commit por **Pedro** em 2026-04-13T16:39:10-03:00
> 11 arquivo(s) — +149 / −29

## Sessão

[[Sistema/Sessões/2026-04-13]]

## Arquivos tocados

- [[Sistema/Endpoints/app/api/admin/promote/route.ts|app/api/admin/promote/route.ts]]
- [[Sistema/Endpoints/app/api/mentor/codes/route.ts|app/api/mentor/codes/route.ts]]
- [[Sistema/Endpoints/app/api/mentor/link/route.ts|app/api/mentor/link/route.ts]]
- [[Sistema/Endpoints/app/api/mentor/my-mentor/route.ts|app/api/mentor/my-mentor/route.ts]]
- [[Sistema/Endpoints/app/api/mentor/student/_studentId_/journal/route.ts|app/api/mentor/student/[studentId]/journal/route.ts]]
- [[Sistema/Endpoints/app/api/mentor/student/_studentId_/kpis/route.ts|app/api/mentor/student/[studentId]/kpis/route.ts]]
- [[Sistema/Endpoints/app/api/mentor/students/route.ts|app/api/mentor/students/route.ts]]
- [[Sistema/Rotas/app/app/settings/page.tsx|app/app/settings/page.tsx]]
- `components/context/SubscriptionContext.tsx` [[Sistema/Arquivos/components/context/SubscriptionContext.tsx|hub]]
- `components/layout/AppSidebar.tsx` [[Sistema/Arquivos/components/layout/AppSidebar.tsx|hub]]
- `lib/email/templates/plan-upgrade.ts` [[Sistema/Arquivos/lib/email/templates/plan-upgrade.ts|hub]]
