---
type: commit
sha: 353f15466a85f2a1b4a8e6902040ab192129ddcd
sha7: 353f154
date: "2026-04-20T22:48:01-03:00"
author: Pedro
commit_type: feat
scope: app
files_changed: 5
insertions: 274
deletions: 19
tags: ["feat", "app", "route", "ui", "docs", "lib"]
---

# feat(app): [C-10] macro filter by user-traded assets

> Commit por **Pedro** em 2026-04-20T22:48:01-03:00
> 5 arquivo(s) — +274 / −19

## Sessão

[[Sistema/Sessões/2026-04-20]]

## Arquivos tocados

- [[Sistema/Rotas/app/app/macro/page.tsx|app/app/macro/page.tsx]]
- `components/macro/MyAssetsFilter.tsx` [[Sistema/Arquivos/components/macro/MyAssetsFilter.tsx|hub]]
- `docs/TRACK-ROADMAP.md` [[Sistema/Arquivos/docs/TRACK-ROADMAP.md|hub]]
- `hooks/useMyAssets.ts` [[Sistema/Arquivos/hooks/useMyAssets.ts|hub]]
- `lib/macro/asset-currency-map.ts` [[Sistema/Arquivos/lib/macro/asset-currency-map.ts|hub]]

## Mensagem

Adds 'Só meus ativos' toggle to macro header. When enabled:
- Calendar events narrow to currencies/countries matching user's recent
  symbols (60-day window from journal_trades).
- Interest rates narrow to issuing countries for those currencies.
- Headlines narrow to items mentioning any traded symbol or currency code.

New files:
- hooks/useMyAssets.ts — surfaces distinct symbols, currencies, countries.
- lib/macro/asset-currency-map.ts — symbol -> ISO currency mapping covering
  forex pairs, metals, crypto, indices, oil.
- components/macro/MyAssetsFilter.tsx — toggle with localStorage persistence.

Toggle disabled when user has no recent trades. Roadmap: C-09 + C-10 marked SHIPPED.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
