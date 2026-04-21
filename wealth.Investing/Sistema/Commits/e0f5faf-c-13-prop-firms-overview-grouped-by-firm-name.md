---
type: commit
sha: e0f5fafbf65139bf5e51932a61ec1ceee1b235a7
sha7: e0f5faf
date: "2026-04-20T23:00:33-03:00"
author: Pedro
commit_type: feat
scope: app
files_changed: 3
insertions: 138
deletions: 1
tags: ["feat", "app", "route", "ui", "docs"]
---

# feat(app): [C-13] prop firms overview grouped by firm_name

> Commit por **Pedro** em 2026-04-20T23:00:33-03:00
> 3 arquivo(s) — +138 / −1

## Sessão

[[Sistema/Sessões/2026-04-20]]

## Arquivos tocados

- [[Sistema/Rotas/app/app/prop/page.tsx|app/app/prop/page.tsx]]
- `components/prop/PropFirmsOverview.tsx` [[Sistema/Arquivos/components/prop/PropFirmsOverview.tsx|hub]]
- `docs/TRACK-ROADMAP.md` [[Sistema/Arquivos/docs/TRACK-ROADMAP.md|hub]]

## Mensagem

PropFirmsOverview rolls up user's prop accounts by firm_name:
- Total allocated capital per firm
- Total PnL (cycle + historical) with % vs starting balance
- Profit eligible for payout (profitSinceLastPayout sum)
- Worst current drawdown across firm accounts

Renders above the existing per-account grid in /app/prop. Sort by allocation
descending so primary firm shows first. Roadmap: C-13 SHIPPED.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
