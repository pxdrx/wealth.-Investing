---
type: commit
sha: ae7821e59667d57a131146ea02bb95c628eaac96
sha7: ae7821e
date: "2026-04-15T02:23:37-03:00"
author: Pedro
commit_type: fix
scope: mobile
files_changed: 2
insertions: 2
deletions: 2
tags: ["fix", "mobile", "route", "ui"]
---

# fix(mobile): bottom padding respeita safe-area + AppMobileNav

> Commit por **Pedro** em 2026-04-15T02:23:37-03:00
> 2 arquivo(s) — +2 / −2

## Sessão

[[Sistema/Sessões/2026-04-15]]

## Arquivos tocados

- [[Sistema/Rotas/app/app/ai-coach/page.tsx|app/app/ai-coach/page.tsx]]
- `components/layout/AppShell.tsx` [[Sistema/Arquivos/components/layout/AppShell.tsx|hub]]

## Mensagem

- AppShell main: pb-[calc(5rem+env(safe-area-inset-bottom))] → conteúdo não é mais cortado pela nav em iPhones com notch
- AI Coach: subtrai safe-area do h-[calc(100dvh-4rem)]

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
