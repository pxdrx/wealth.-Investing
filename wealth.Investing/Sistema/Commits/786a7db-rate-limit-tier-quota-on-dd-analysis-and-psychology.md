---
type: commit
sha: 786a7dbf45549e3ae38cea84119aa7debc608011
sha7: 786a7db
date: "2026-04-15T02:56:32-03:00"
author: Pedro
commit_type: feat
scope: ai
files_changed: 3
insertions: 130
deletions: 0
tags: ["feat", "ai", "api", "lib"]
---

# feat(ai): rate limit + tier quota on dd-analysis and psychology

> Commit por **Pedro** em 2026-04-15T02:56:32-03:00
> 3 arquivo(s) — +130 / −0

## Sessão

[[Sistema/Sessões/2026-04-15]]

## Arquivos tocados

- [[Sistema/Endpoints/app/api/ai/dd-analysis/route.ts|app/api/ai/dd-analysis/route.ts]]
- [[Sistema/Endpoints/app/api/ai/psychology/route.ts|app/api/ai/psychology/route.ts]]
- `lib/rate-limit.ts` [[Sistema/Arquivos/lib/rate-limit.ts|hub]]

## Mensagem

Free users could drain Anthropic credits via /api/ai/dd-analysis (zero gating)
and /api/ai/psychology (cache only). Both now share the AI Coach pattern:
Upstash burst rate limit (3/60s) + monthly quota via ai_usage with optimistic
increment/decrement rollback on Anthropic failure.
