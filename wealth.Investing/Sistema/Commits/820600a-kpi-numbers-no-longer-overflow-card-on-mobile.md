---
type: commit
sha: 820600a91482f3d95101e5480d061ac5fa1fbdae
sha7: 820600a
date: "2026-04-15T02:28:40-03:00"
author: Pedro
commit_type: fix
scope: dashboard
files_changed: 1
insertions: 9
deletions: 8
tags: ["fix", "dashboard", "ui"]
---

# fix(dashboard): KPI numbers no longer overflow card on mobile

> Commit por **Pedro** em 2026-04-15T02:28:40-03:00
> 1 arquivo(s) — +9 / −8

## Sessão

[[Sistema/Sessões/2026-04-15]]

## Arquivos tocados

- `components/dashboard/AccountsOverview.tsx` [[Sistema/Arquivos/components/dashboard/AccountsOverview.tsx|hub]]

## Mensagem

Cards (Capital, Sacado, P&L Geral, Contas Ativas) used a fixed text-[26px] which overflowed the 2-col grid on small screens (~165px wide each), cutting the value in half. Now scales 15px → 18px → 26px from mobile up. Also p-3 on mobile, min-w-0 + truncate as a safety net.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
