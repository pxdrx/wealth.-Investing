---
type: commit
sha: 9db65dbdf4fdc75fc893e7375d9d814c36628aea
sha7: 9db65db
date: "2026-04-15T15:23:29-03:00"
author: Pedro
commit_type: feat
scope: prop
files_changed: 8
insertions: 975
deletions: 85
tags: ["feat", "prop", "api", "route", "ui", "lib"]
---

# feat(prop): EOD drawdown + editable rules per account + phase rework

> Commit por **Pedro** em 2026-04-15T15:23:29-03:00
> 8 arquivo(s) — +975 / −85

## Sessão

[[Sistema/Sessões/2026-04-15]]

## Arquivos tocados

- [[Sistema/Endpoints/app/api/prop-account/update/route.ts|app/api/prop-account/update/route.ts]]
- [[Sistema/Rotas/app/app/prop/page.tsx|app/app/prop/page.tsx]]
- `components/account/AddAccountModal.tsx` [[Sistema/Arquivos/components/account/AddAccountModal.tsx|hub]]
- `components/account/EditAccountRulesDrawer.tsx` [[Sistema/Arquivos/components/account/EditAccountRulesDrawer.tsx|hub]]
- `components/account/ManageAccountsModal.tsx` [[Sistema/Arquivos/components/account/ManageAccountsModal.tsx|hub]]
- `lib/accounts.ts` [[Sistema/Arquivos/lib/accounts.ts|hub]]
- `lib/prop-stats.ts` [[Sistema/Arquivos/lib/prop-stats.ts|hub]]
- `supabase/migrations/20260415_prop_eod_drawdown_rules.sql` [[Sistema/Arquivos/supabase/migrations/20260415_prop_eod_drawdown_rules.sql|hub]]

## Mensagem

Adds 'eod' drawdown type for futures prop firms (Lucid/Apex/Topstep) with
one-way trailing floor and optional trail lock (threshold → permanent floor).
calc_drawdown RPC now returns hwm_eod_usd bucketed by broker-TZ daily close;
prop-stats computes bar % from distance to (locked or trailing) floor.

Add-account modal replaces "current phase" input with Evaluation/Funded +
phase count (1-3). New presets for Lucid/Apex/Topstep with EOD defaults and
auto-computed trail lock. Pencil icon on PropAccountCard and SlidersHorizontal
in ManageAccountsModal open EditAccountRulesDrawer — fully editable rules
(firm, balance, targets, daily/overall DD, drawdown type, trail lock, phase,
timezone, reset rule) persisted via new PATCH /api/prop-account/update.

Schema adds total_phases (0=funded, 1-3=eval), trail_lock_threshold_usd,
trail_locked_floor_usd. Constraints widened for phase_3 and reset_rule
(cme_daily/midnight). Search_path locked on calc_drawdown.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
