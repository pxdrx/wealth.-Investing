---
type: commit
sha: 86468a1a4b762b1f62ac149710723e04495acfcd
sha7: 86468a1
date: "2026-04-14T21:55:05-03:00"
author: Pedro
commit_type: fix
scope: auth
files_changed: 2
insertions: 8
deletions: 1
tags: ["fix", "auth", "route", "ui"]
---

# fix(auth): hide AppShell on /reset-password + clear session after password update

> Commit por **Pedro** em 2026-04-14T21:55:05-03:00
> 2 arquivo(s) — +8 / −1

## Sessão

[[Sistema/Sessões/2026-04-14]]

## Arquivos tocados

- [[Sistema/Rotas/app/reset-password/page.tsx|app/reset-password/page.tsx]]
- `components/layout/AppShell.tsx` [[Sistema/Arquivos/components/layout/AppShell.tsx|hub]]

## Mensagem

- /reset-password no longer renders sidebar/app shell (was causing providers to spin)
- After updateUser success, manually clear supabase token + sessionStorage
- Then redirect to /login so user signs in with the new password

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
