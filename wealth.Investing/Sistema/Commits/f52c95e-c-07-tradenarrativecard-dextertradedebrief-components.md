---
type: commit
sha: f52c95eef38d5129b57d9e29920a60fb110ad1f1
sha7: f52c95e
date: "2026-04-20T14:58:48-03:00"
author: Pedro
commit_type: feat
scope: app
files_changed: 4
insertions: 475
deletions: 0
tags: ["feat", "app", "ui"]
---

# feat(app): [C-07] TradeNarrativeCard + DexterTradeDebrief components

> Commit por **Pedro** em 2026-04-20T14:58:48-03:00
> 4 arquivo(s) — +475 / −0

## Sessão

[[Sistema/Sessões/2026-04-20]]

## Arquivos tocados

- `components/journal/DexterTradeDebrief.tsx` [[Sistema/Arquivos/components/journal/DexterTradeDebrief.tsx|hub]]
- `components/journal/JournalViewToggle.tsx` [[Sistema/Arquivos/components/journal/JournalViewToggle.tsx|hub]]
- `components/journal/TradeNarrativeCard.tsx` [[Sistema/Arquivos/components/journal/TradeNarrativeCard.tsx|hub]]
- `components/journal/TradeNarrativeList.tsx` [[Sistema/Arquivos/components/journal/TradeNarrativeList.tsx|hub]]

## Mensagem

Components for the narrative journal view.
- TradeNarrativeCard: story-driven card with symbol pill, direction,
  P&L headline, tags, context snippet, Dexter debrief slot, details CTA.
- DexterTradeDebrief: lazy-fetches /api/dexter/trade-debrief via
  IntersectionObserver; skeleton, error, and lock states.
- TradeNarrativeList: wrapper rendering cards newest-first.
- JournalViewToggle: cards|tabela toggle (used in commit 4).

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
