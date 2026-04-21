---
type: commit
sha: a9887844dda6a1d157c73360bea5e7ed9ec5ab15
sha7: a988784
date: "2026-04-20T23:03:39-03:00"
author: Pedro
commit_type: feat
scope: app
files_changed: 3
insertions: 63
deletions: 4
tags: ["feat", "app", "route", "ui", "docs"]
---

# feat(app): [C-14] PDF export via print stylesheet with branding

> Commit por **Pedro** em 2026-04-20T23:03:39-03:00
> 3 arquivo(s) — +63 / −4

## Sessão

[[Sistema/Sessões/2026-04-20]]

## Arquivos tocados

- `app/globals.css` [[Sistema/Arquivos/app/globals.css|hub]]
- `components/journal/JournalReports.tsx` [[Sistema/Arquivos/components/journal/JournalReports.tsx|hub]]
- `docs/TRACK-ROADMAP.md` [[Sistema/Arquivos/docs/TRACK-ROADMAP.md|hub]]

## Mensagem

- Adds Exportar PDF button in JournalReports toolbar -> window.print().
- Print-only header with wealth.Investing brandmark + timestamp.
- @media print in globals.css: hides all body children except
  #journal-print-root, drops interactive chrome, sets A4 margins.

Zero dependencies. Users save via browser's print-to-PDF dialog.
Roadmap: C-14 SHIPPED.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
