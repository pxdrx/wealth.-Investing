---
type: commit
sha: b33b0b58442a63fa79db0152bb4a1ef6298d1a3d
sha7: b33b0b5
date: "2026-04-14T21:47:07-03:00"
author: Pedro
commit_type: feat
scope: auth
files_changed: 3
insertions: 212
deletions: 3
tags: ["feat", "auth", "route"]
---

# feat(auth): implement forgot password flow

> Commit por **Pedro** em 2026-04-14T21:47:07-03:00
> 3 arquivo(s) — +212 / −3

## Sessão

[[Sistema/Sessões/2026-04-14]]

## Arquivos tocados

- [[Sistema/Rotas/app/login/page.tsx|app/login/page.tsx]]
- `app/reset-password/layout.tsx` [[Sistema/Arquivos/app/reset-password/layout.tsx|hub]]
- [[Sistema/Rotas/app/reset-password/page.tsx|app/reset-password/page.tsx]]

## Mensagem

- /login: new 'forgot' mode with email input and resetPasswordForEmail
- /reset-password: verify recovery code/token and set new password
- Success redirect back to /login with info banner

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
