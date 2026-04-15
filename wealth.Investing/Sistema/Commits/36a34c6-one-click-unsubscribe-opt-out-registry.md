---
type: commit
sha: 36a34c69b0d7bd66ca2ed15327a362e8aa3c46c0
sha7: 36a34c6
date: "2026-04-15T16:06:44-03:00"
author: Pedro
commit_type: feat
scope: email
files_changed: 6
insertions: 186
deletions: 4
tags: ["feat", "email", "api", "lib"]
---

# feat(email): one-click unsubscribe + opt-out registry

> Commit por **Pedro** em 2026-04-15T16:06:44-03:00
> 6 arquivo(s) — +186 / −4

## Sessão

[[Sistema/Sessões/2026-04-15]]

## Arquivos tocados

- [[Sistema/Endpoints/app/api/cron/morning-briefing/route.ts|app/api/cron/morning-briefing/route.ts]]
- [[Sistema/Endpoints/app/api/unsubscribe/route.ts|app/api/unsubscribe/route.ts]]
- `lib/email/send.ts` [[Sistema/Arquivos/lib/email/send.ts|hub]]
- `lib/email/templates/morning-briefing.ts` [[Sistema/Arquivos/lib/email/templates/morning-briefing.ts|hub]]
- `lib/email/unsubscribe-token.ts` [[Sistema/Arquivos/lib/email/unsubscribe-token.ts|hub]]
- `supabase/migrations/20260415_email_opt_outs.sql` [[Sistema/Arquivos/supabase/migrations/20260415_email_opt_outs.sql|hub]]

## Mensagem

- email_opt_outs table (email PK, user_id, source, timestamp)
- HMAC-signed tokens via CRON_SECRET (rotating the secret invalidates links)
- /api/unsubscribe GET (user click, shows confirmation page)
- /api/unsubscribe POST (Gmail/Outlook RFC 8058 one-click)
- morning-briefing filters opt-outs before render, passes per-recipient URL
- List-Unsubscribe header now carries the real URL + mailto fallback
- Footer link in the template

Closes the spam-hygiene loop: mailbox providers see a live unsubscribe URL
and their one-click actually persists the opt-out instead of hitting a
placeholder mailto inbox.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
