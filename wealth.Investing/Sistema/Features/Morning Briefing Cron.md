---
type: feature
tags: [feature, cron, briefing, macro, infra]
last_commit: 8cb8d37
last_updated: 2026-04-14
commits_count: 3
---

# Morning Briefing Cron

> Cron diário que gera o briefing macro. Vercel Hobby limita crons — foi preciso reorganizar.

## Mudanças no dia 14/04

- **Unblock todos os 8 crons no Vercel Hobby** ([[Sistema/Commits/bb8d442-unblock-all-8-crons-on-vercel-hobby|bb8d442]]) — Hobby só permite crons diários; ajustado schedule para caber no limite.
- **Trigger manual admin-authed** para morning briefing ([[Sistema/Commits/8cb8d37-allow-admin-authed-manual-trigger-of-morning-briefing|8cb8d37]]) — útil para debug sem esperar o cron.
- **Fix timezone + diagnóstico 503** quando `CRON_SECRET` ausente ([[Sistema/Commits/2fc546b-morning-briefing-timezone-diagnostic-503-when-cron-secret-mi|2fc546b]]).

## Relacionado

- [[Funcionalidades/Briefing Macroeconômico]]
- [[Decisões/Macro Intelligence]]
- [[Sistema/Endpoints]] — `/api/cron/morning-briefing`
- [[Sistema/Sessões/2026-04-14]]
