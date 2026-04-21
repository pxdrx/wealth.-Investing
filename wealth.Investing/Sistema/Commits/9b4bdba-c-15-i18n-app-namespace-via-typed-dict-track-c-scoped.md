---
type: commit
sha: 9b4bdba9692a53daeecdb83db7ec2b505e3fd9c9
sha7: 9b4bdba
date: "2026-04-20T23:05:51-03:00"
author: Pedro
commit_type: feat
scope: app
files_changed: 5
insertions: 93
deletions: 7
tags: ["feat", "app", "route", "docs", "lib"]
---

# feat(app): [C-15] i18n app.* namespace via typed dict (Track-C scoped)

> Commit por **Pedro** em 2026-04-20T23:05:51-03:00
> 5 arquivo(s) — +93 / −7

## Sessão

[[Sistema/Sessões/2026-04-20]]

## Arquivos tocados

- [[Sistema/Rotas/app/app/journal/page.tsx|app/app/journal/page.tsx]]
- [[Sistema/Rotas/app/app/macro/page.tsx|app/app/macro/page.tsx]]
- `docs/TRACK-ROADMAP.md` [[Sistema/Arquivos/docs/TRACK-ROADMAP.md|hub]]
- `hooks/useAppLocale.ts` [[Sistema/Arquivos/hooks/useAppLocale.ts|hub]]
- `lib/i18n/app.ts` [[Sistema/Arquivos/lib/i18n/app.ts|hub]]

## Mensagem

Ships a lightweight Track-C-owned dictionary for the authenticated surface
instead of editing messages/{pt,en}.json (Track B owned per coordination).

- lib/i18n/app.ts — PT + EN dicts, tApp() lookup with PT fallback.
- hooks/useAppLocale.ts — useAppT() reads next-intl locale when provider is
  mounted, defaults to pt otherwise.
- Migrate journal header + macro header labels as proof of pattern.

When Track B's messages tree stabilizes, these keys can be folded into the
next-intl JSON with a mechanical copy. Marked [PARTIAL] in roadmap — wider
coverage (dashboard greeting, sidebar labels, subscription) is follow-up.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
