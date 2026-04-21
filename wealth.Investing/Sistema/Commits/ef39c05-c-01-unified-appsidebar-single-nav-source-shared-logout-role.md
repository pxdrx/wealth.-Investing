---
type: commit
sha: ef39c05a630a452531f17f333d059899ccbc3a1b
sha7: ef39c05
date: "2026-04-20T00:32:07-03:00"
author: Pedro
commit_type: feat
scope: app
files_changed: 4
insertions: 83
deletions: 11
tags: ["feat", "app", "route"]
---

# feat(app): [C-01] unified AppSidebar — single nav source + shared logout/roles

> Commit por **Pedro** em 2026-04-20T00:32:07-03:00
> 4 arquivo(s) — +83 / −11

## Sessão

[[Sistema/Sessões/2026-04-20]]

## Arquivos tocados

- `app/[locale]/layout.tsx` [[Sistema/Arquivos/app/_locale_/layout.tsx|hub]]
- [[Sistema/Rotas/app/_locale_/page.tsx|app/[locale]/page.tsx]]
- `middleware.ts` [[Sistema/Arquivos/middleware.ts|hub]]
- `next.config.mjs` [[Sistema/Arquivos/next.config.mjs|hub]]

## Mensagem

Consolidates the three sidebar/header/mobile-nav components onto one nav
config and one role-detection hook. AppHeader slims down to a mobile-only
brand bar with a slide-in drawer for secondary items.

- lib/app-nav.ts: single AppNavItem source, mobileBar flag for bottom tab filtering
- lib/hooks/useAppRoles.ts: consolidated admin + mentor student detection
- lib/auth/logout.ts: shared manual localStorage cleanup (CLAUDE.md rule)
- lib/analytics/emit.ts: no-op wrapper; rewires to Track B events.ts when it lands
- AppSidebar, AppMobileNav, AppHeader: refactored to consume the above

Scope: structural only. No visual changes, no entitlements migration
(deferred to C-02), no brand components touched.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
