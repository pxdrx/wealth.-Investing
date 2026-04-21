---
type: commit
sha: 9d3f7910346ab777391b7d2d23710fbe83d9711b
sha7: 9d3f791
date: "2026-04-20T09:39:31-03:00"
author: Pedro
commit_type: feat
scope: app
files_changed: 7
insertions: 544
deletions: 1
tags: ["feat", "app", "api", "route", "ui", "docs", "lib"]
---

# feat(app): [C-03] Dexter "Hoje, isso importa" hero card

> Commit por **Pedro** em 2026-04-20T09:39:31-03:00
> 7 arquivo(s) — +544 / −1

## Sessão

[[Sistema/Sessões/2026-04-20]]

## Arquivos tocados

- `.gitignore` [[Sistema/Arquivos/.gitignore|hub]]
- [[Sistema/Endpoints/app/api/dexter/today/route.ts|app/api/dexter/today/route.ts]]
- [[Sistema/Rotas/app/app/page.tsx|app/app/page.tsx]]
- `components/dashboard/TodayMatters.tsx` [[Sistema/Arquivos/components/dashboard/TodayMatters.tsx|hub]]
- `docs/BUILD-DEBT.md` [[Sistema/Arquivos/docs/BUILD-DEBT.md|hub]]
- `lib/entitlements.ts` [[Sistema/Arquivos/lib/entitlements.ts|hub]]
- `lib/subscription-shared.ts` [[Sistema/Arquivos/lib/subscription-shared.ts|hub]]

## Mensagem

- app/api/dexter/today/route.ts: GET endpoint, Bearer auth, per-plan
  Redis TTL (24h free / 4h pro+), strict-JSON prompt, claude-haiku-4-5
- components/dashboard/TodayMatters.tsx: client card, 4 states
  (loading/success/error/empty), terminal-dark styling, freshness
  label on paid plans, MascotPlaceholder pending Track A
- lib/entitlements.ts + subscription-shared.ts: add "dexterTodayCard"
  Feature + hasDexterTodayCard tier limit (true across all plans —
  cooldown enforced in route, not tier)
- app/app/page.tsx: inject <TodayMatters /> at top, above every
  existing widget (widget removal reserved for C-05)
- .gitignore: negate app/api/dexter/ (dexter/ rule was for scratch dir)
- docs/BUILD-DEBT.md: note MascotPlaceholder callsite

TODOs in route: tilt_score / macro_events schemas not yet present;
snapshot builds only from journal_trades today.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
