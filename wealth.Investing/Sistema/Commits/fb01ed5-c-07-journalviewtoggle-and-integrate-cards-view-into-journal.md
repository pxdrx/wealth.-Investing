---
type: commit
sha: fb01ed5d723d07f0dc59720671094f0f109c812a
sha7: fb01ed5
date: "2026-04-20T22:20:01-03:00"
author: Pedro
commit_type: feat
scope: app
files_changed: 1
insertions: 29
deletions: 1
tags: ["feat", "app", "route"]
---

# feat(app): [C-07] JournalViewToggle and integrate cards view into journal page

> Commit por **Pedro** em 2026-04-20T22:20:01-03:00
> 1 arquivo(s) — +29 / −1

## Sessão

[[Sistema/Sessões/2026-04-20]]

## Arquivos tocados

- [[Sistema/Rotas/app/app/journal/page.tsx|app/app/journal/page.tsx]]

## Mensagem

Adds cards|table toggle above the Trades tab list.
- Default: cards on mobile, table on desktop (viewport check on mount).
- Preference persisted in localStorage('journal.view').
- Both views share the same paginated 'trades' array.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
