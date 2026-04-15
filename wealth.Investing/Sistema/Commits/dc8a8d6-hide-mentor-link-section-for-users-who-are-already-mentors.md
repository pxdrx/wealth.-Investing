---
type: commit
sha: dc8a8d6a5625232c812a2f534238e8ef25184839
sha7: dc8a8d6
date: "2026-04-14T16:36:21-03:00"
author: Pedro
commit_type: fix
scope: settings
files_changed: 1
insertions: 5
deletions: 2
tags: ["fix", "settings", "route"]
---

# fix(settings): hide mentor-link section for users who are already mentors

> Commit por **Pedro** em 2026-04-14T16:36:21-03:00
> 1 arquivo(s) — +5 / −2

## Sessão

[[Sistema/Sessões/2026-04-14]]

## Arquivos tocados

- [[Sistema/Rotas/app/app/settings/page.tsx|app/app/settings/page.tsx]]

## Mensagem

Mentors should not see the "vincular a um mentor" UI in settings — they
manage students, not join mentors. Wraps the section in {!isMentor && ...}
and short-circuits the loadMentor effect to skip the unnecessary fetch
(also eliminates one more loading flag that could contribute to spinner bugs).

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
