---
type: commit
sha: 8608546b1f22879a4ad115e78993521e23e62624
sha7: 8608546
date: "2026-04-15T02:01:10-03:00"
author: Pedro
commit_type: fix
scope: mobile
files_changed: 16
insertions: 35
deletions: 35
tags: ["fix", "mobile", "route", "ui"]
---

# fix(mobile): destrava modais, equity chart e AI Coach no celular

> Commit por **Pedro** em 2026-04-15T02:01:10-03:00
> 16 arquivo(s) — +35 / −35

## Sessão

[[Sistema/Sessões/2026-04-15]]

## Arquivos tocados

- [[Sistema/Rotas/app/app/ai-coach/page.tsx|app/app/ai-coach/page.tsx]]
- [[Sistema/Rotas/app/app/analyst/page.tsx|app/app/analyst/page.tsx]]
- [[Sistema/Rotas/app/app/journal/page.tsx|app/app/journal/page.tsx]]
- [[Sistema/Rotas/app/app/mentor/page.tsx|app/app/mentor/page.tsx]]
- [[Sistema/Rotas/app/app/prop/page.tsx|app/app/prop/page.tsx]]
- [[Sistema/Rotas/app/app/settings/page.tsx|app/app/settings/page.tsx]]
- `components/ai/ChatInput.tsx` [[Sistema/Arquivos/components/ai/ChatInput.tsx|hub]]
- `components/ai/ChatMessage.tsx` [[Sistema/Arquivos/components/ai/ChatMessage.tsx|hub]]
- `components/dashboard/AccountsOverview.tsx` [[Sistema/Arquivos/components/dashboard/AccountsOverview.tsx|hub]]
- `components/dashboard/BacktestSection.tsx` [[Sistema/Arquivos/components/dashboard/BacktestSection.tsx|hub]]
- `components/dashboard/JournalBriefing.tsx` [[Sistema/Arquivos/components/dashboard/JournalBriefing.tsx|hub]]
- `components/dashboard/SessionHeatmap.tsx` [[Sistema/Arquivos/components/dashboard/SessionHeatmap.tsx|hub]]
- `components/journal/DayDetailModal.tsx` [[Sistema/Arquivos/components/journal/DayDetailModal.tsx|hub]]
- `components/journal/JournalTradesTable.tsx` [[Sistema/Arquivos/components/journal/JournalTradesTable.tsx|hub]]
- `components/journal/TradeDetailModal.tsx` [[Sistema/Arquivos/components/journal/TradeDetailModal.tsx|hub]]
- `components/ui/dialog.tsx` [[Sistema/Arquivos/components/ui/dialog.tsx|hub]]

## Mensagem

- DialogContent: largura calc(100vw-2rem) + max-h dvh; X com hitbox 40px → todos os modais (TradeDetail, DayDetail, AddTrade, DdBreach) ficam acessíveis em mobile
- JournalBriefing: chart com altura fixa 220px em mobile (Recharts mediava 0 dentro de flex sem altura)
- AI Coach: main h-[calc(100dvh-4rem)] compensa AppMobileNav, padding mobile reduzido, header/input encolhem; ChatInput sem max-w-95%, ChatMessage 92% em mobile
- Tabelas com min-w-[640px] + overflow-x-auto (JournalTradesTable, AccountsOverview)
- SessionHeatmap stacka em mobile, BacktestSection KPIs grid-cols-2 em mobile
- Touch targets: settings ordering buttons 44×44, analyst delete 36×36 sempre visível
- overflow-x-hidden guard em journal/prop/mentor/analyst/settings

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
