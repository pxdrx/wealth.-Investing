---
type: commit
sha: 1111937be52a35ec459bf0e5781c9e7bf2335985
sha7: 1111937
date: "2026-04-20T01:14:23-03:00"
author: Pedro
commit_type: docs
scope: track-c
files_changed: 1
insertions: 59
deletions: 0
tags: ["docs", "track-c"]
---

# docs(track-c): add BUILD-DEBT.md for cross-track failures

> Commit por **Pedro** em 2026-04-20T01:14:23-03:00
> 1 arquivo(s) — +59 / −0

## Sessão

[[Sistema/Sessões/2026-04-20]]

## Arquivos tocados

- `docs/BUILD-DEBT.md` [[Sistema/Arquivos/docs/BUILD-DEBT.md|hub]]

## Mensagem

Tracks three pre-existing build/tsc errors surfaced during C-02:
- [locale]/layout.tsx + i18n.ts  → Track B (next-intl routing)
- components/brand/index.ts      → Track A (missing Mascot.tsx)

These are orthogonal to C-02 and will resolve when A/B merge.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
