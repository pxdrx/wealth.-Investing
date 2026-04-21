---
type: commit
sha: 5090b93a156af1bc0e847899ffe5821579b1b8ca
sha7: 5090b93
date: "2026-04-20T22:34:13-03:00"
author: Pedro
commit_type: fix
scope: build
files_changed: 3
insertions: 22
deletions: 8
tags: ["fix", "build", "route", "ui"]
---

# fix(build): repair next-intl routing export and remove missing Mascot barrel

> Commit por **Pedro** em 2026-04-20T22:34:13-03:00
> 3 arquivo(s) — +22 / −8

## Sessão

[[Sistema/Sessões/2026-04-20]]

## Arquivos tocados

- `app/[locale]/layout.tsx` [[Sistema/Arquivos/app/_locale_/layout.tsx|hub]]
- `components/brand/index.ts` [[Sistema/Arquivos/components/brand/index.ts|hub]]
- `i18n.ts` [[Sistema/Arquivos/i18n.ts|hub]]

## Mensagem

- i18n.ts: add routing via defineRouting, Locale type, fix getRequestConfig
  to return { locale, messages } and await requestLocale (next-intl v4).
- app/[locale]/layout.tsx: params is Promise in Next 15, await before use.
- components/brand/index.ts: drop Mascot re-export until Track A ships file.

Unblocks Vercel deploys failing on 'routing' / 'Locale' not exported from @/i18n.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
