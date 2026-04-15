---
type: commit
sha: 401927dd2b8b602f7cb73c35bbed54af094c3ed6
sha7: 401927d
date: "2026-04-15T02:27:11-03:00"
author: Pedro
commit_type: fix
scope: ai-coach
files_changed: 1
insertions: 64
deletions: 46
tags: ["fix", "ai-coach", "route"]
---

# fix(ai-coach): resolve infinite loading on soft client-side nav

> Commit por **Pedro** em 2026-04-15T02:27:11-03:00
> 1 arquivo(s) — +64 / −46

## Sessão

[[Sistema/Sessões/2026-04-15]]

## Arquivos tocados

- [[Sistema/Rotas/app/app/ai-coach/page.tsx|app/app/ai-coach/page.tsx]]

## Mensagem

Page ran 4+ concurrent supabase.auth.getSession() calls on mount, each guarded by Promise.race timeouts. On soft-nav the localStorage session token store is re-hydrated asynchronously and the timeouts fired before hydration completed, leaving initConversations on its early-return path with activeConversationId=null forever — spinner stuck until the 10s safety timeout most users never wait for.

- getToken now reads ctxSession.access_token from useAuthEvent() synchronously; only falls back to getSession when context is empty.
- loadUsage and loadHistory consume ctxSession.user.id directly — Promise.race timeouts removed.
- initConversations gated on ctxSession with a ref guard so it runs exactly once when the session arrives.
- Safety timeout 10s -> 3s; logs which flag was stuck + ctxSession state for any remaining edge case.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
