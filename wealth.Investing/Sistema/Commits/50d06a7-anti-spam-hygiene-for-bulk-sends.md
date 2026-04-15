---
type: commit
sha: 50d06a7650e905cf519b37f45bb47366f9222502
sha7: 50d06a7
date: "2026-04-15T15:40:50-03:00"
author: Pedro
commit_type: feat
scope: email
files_changed: 2
insertions: 50
deletions: 2
tags: ["feat", "email", "api", "lib"]
---

# feat(email): anti-spam hygiene for bulk sends

> Commit por **Pedro** em 2026-04-15T15:40:50-03:00
> 2 arquivo(s) — +50 / −2

## Sessão

[[Sistema/Sessões/2026-04-15]]

## Arquivos tocados

- [[Sistema/Endpoints/app/api/cron/morning-briefing/route.ts|app/api/cron/morning-briefing/route.ts]]
- `lib/email/send.ts` [[Sistema/Arquivos/lib/email/send.ts|hub]]

## Mensagem

Gmail/Outlook bulk-sender guidelines reward:
- List-Unsubscribe header (RFC 8058, one-click)
- plain-text multipart fallback, not HTML-only
- clean subject without emoji on recurring newsletter patterns

Adds all three to the shared sendEmail helper so every cron email benefits,
and removes ☀️ emoji from morning-briefing subject (daily emojis with
repeating patterns trigger Promotions-tab bucketing).

Follow-up: build /api/unsubscribe endpoint so List-Unsubscribe-Post actually
resolves instead of falling through to mailto.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
