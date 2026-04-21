---
type: commit
sha: a39e6dfa006ee54c58ced51b8b6b8addeb52738b
sha7: a39e6df
date: "2026-04-20T10:18:01-03:00"
author: Pedro
commit_type: refactor
scope: dexter
files_changed: 9
insertions: 229
deletions: 8
tags: ["refactor", "dexter", "route", "ui", "lib"]
---

# refactor(dexter): [C-06] unified shell + tab routing

> Commit por **Pedro** em 2026-04-20T10:18:01-03:00
> 9 arquivo(s) — +229 / −8

## Sessão

[[Sistema/Sessões/2026-04-20]]

## Arquivos tocados

- `.gitignore` [[Sistema/Arquivos/.gitignore|hub]]
- [[Sistema/Rotas/app/app/dexter/analyst/page.tsx|app/app/dexter/analyst/page.tsx]]
- [[Sistema/Rotas/app/app/dexter/chat/page.tsx|app/app/dexter/chat/page.tsx]]
- [[Sistema/Rotas/app/app/dexter/coach/page.tsx|app/app/dexter/coach/page.tsx]]
- `app/app/dexter/layout.tsx` [[Sistema/Arquivos/app/app/dexter/layout.tsx|hub]]
- [[Sistema/Rotas/app/app/dexter/page.tsx|app/app/dexter/page.tsx]]
- `components/layout/AppSidebar.tsx` [[Sistema/Arquivos/components/layout/AppSidebar.tsx|hub]]
- `lib/app-nav.ts` [[Sistema/Arquivos/lib/app-nav.ts|hub]]
- `next.config.mjs` [[Sistema/Arquivos/next.config.mjs|hub]]

## Mensagem

- app/app/dexter/layout.tsx: client shell with Bot avatar placeholder
  (TODO Track A Mascot), title, mood chip wired to /api/dashboard/today-stats
  (same source as DayKpis), horizontal tabs with emerald active indicator,
  arrow-left / arrow-right keyboard nav
- app/app/dexter/page.tsx: server redirect to /app/dexter/chat (default tab)
- app/app/dexter/{chat,coach,analyst}/page.tsx: placeholders.
  Coach wrapped in PaywallGate requiredPlan="pro", Analyst in
  PaywallGate requiredPlan="ultra" — chat stays open to all plans.
  Content ships in C-07 / C-08 / C-09.
- next.config.mjs: permanent 308 redirects
  /ai-coach{,/*} and /app/ai-coach{,/*} → /app/dexter/coach
  /analyst{,/*}  and /app/analyst{,/*}  → /app/dexter/analyst
- lib/app-nav.ts: drop ai-coach + analyst entries, add single "Dexter"
  entry (Bot icon placeholder, mobileBar + highlight)
- components/layout/AppSidebar.tsx: conversation sub-items attach to
  "/app/dexter" instead of "/app/ai-coach"; Link hrefs now point at
  /app/dexter/coach?chat=<id>
- .gitignore: negate app/app/dexter/ (dexter/ rule was scratch-dir only)

Old files (app/app/ai-coach, app/app/analyst) kept in place but shadowed
by redirects. Deletion reserved for C-11 cleanup.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
