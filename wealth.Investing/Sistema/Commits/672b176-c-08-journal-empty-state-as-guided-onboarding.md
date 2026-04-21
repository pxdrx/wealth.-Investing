---
type: commit
sha: 672b1764d15b6a96d014cd17cbe63fe4bc9ad6d8
sha7: 672b176
date: "2026-04-20T22:26:10-03:00"
author: Pedro
commit_type: feat
scope: app
files_changed: 2
insertions: 163
deletions: 18
tags: ["feat", "app", "route", "ui"]
---

# feat(app): [C-08] Journal empty state as guided onboarding

> Commit por **Pedro** em 2026-04-20T22:26:10-03:00
> 2 arquivo(s) — +163 / −18

## Sessão

[[Sistema/Sessões/2026-04-20]]

## Arquivos tocados

- [[Sistema/Rotas/app/app/journal/page.tsx|app/app/journal/page.tsx]]
- `components/journal/JournalEmptyOnboarding.tsx` [[Sistema/Arquivos/components/journal/JournalEmptyOnboarding.tsx|hub]]

## Mensagem

JournalEmptyOnboarding replaces the single 'Nenhum trade' icon+CTA with
a two-card guided flow (Import MT5 recommended, Add manual) plus a
'what Dexter does with your trades' promise row. Personalizes greeting
with the active account name.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
