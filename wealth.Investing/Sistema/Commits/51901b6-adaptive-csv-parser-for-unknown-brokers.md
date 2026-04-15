---
type: commit
sha: 51901b66b4ea1fe4fe4eed11b4aee529fa953f48
sha7: 51901b6
date: "2026-04-15T15:23:06-03:00"
author: Pedro
commit_type: feat
scope: journal
files_changed: 4
insertions: 1071
deletions: 13
tags: ["feat", "journal", "api", "route", "ui", "lib"]
---

# feat(journal): adaptive CSV parser for unknown brokers

> Commit por **Pedro** em 2026-04-15T15:23:06-03:00
> 4 arquivo(s) — +1071 / −13

## Sessão

[[Sistema/Sessões/2026-04-15]]

## Arquivos tocados

- [[Sistema/Endpoints/app/api/journal/import-mt5/route.ts|app/api/journal/import-mt5/route.ts]]
- [[Sistema/Rotas/app/app/journal/page.tsx|app/app/journal/page.tsx]]
- `components/journal/ImportPreview.tsx` [[Sistema/Arquivos/components/journal/ImportPreview.tsx|hub]]
- `lib/csv-adaptive-parser.ts` [[Sistema/Arquivos/lib/csv-adaptive-parser.ts|hub]]

## Mensagem

4-layer column resolver (alias → fuzzy tokens → value-sniff → derivation)
with per-row direction derivation from Bought/Sold Timestamps, MM/DD vs
DD/MM disambiguation, noise tolerance, and trail-lock-ready dedup tag
(csv_generic/csv_tradovate). Falls back from cTrader fast-path.

Preview surfaces the detected mapping, warnings, and open-position skip
count so users see what the parser chose before confirming.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
