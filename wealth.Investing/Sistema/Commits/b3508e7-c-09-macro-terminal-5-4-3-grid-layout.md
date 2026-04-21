---
type: commit
sha: b3508e7b7d4625f4271436f9e53634f0badee50a
sha7: b3508e7
date: "2026-04-20T22:39:33-03:00"
author: Pedro
commit_type: feat
scope: app
files_changed: 1
insertions: 95
deletions: 36
tags: ["feat", "app", "route"]
---

# feat(app): [C-09] macro terminal 5-4-3 grid layout

> Commit por **Pedro** em 2026-04-20T22:39:33-03:00
> 1 arquivo(s) — +95 / −36

## Sessão

[[Sistema/Sessões/2026-04-20]]

## Arquivos tocados

- [[Sistema/Rotas/app/app/macro/page.tsx|app/app/macro/page.tsx]]

## Mensagem

Redesign Terminal tab from vertical stack into dense Bloomberg-like grid:
- Row 1 (5 cols): Calendar 3 / Bancos Centrais 2
- Row 2 (4 cols): Headlines 3 / Sentimento Global 1 (SentimentBar)
- Row 3 (3 cols): Histórico Macro 2 / Semana em Números 1 (event-impact counters)

Mobile collapses to single column. Relatório tab unchanged.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
