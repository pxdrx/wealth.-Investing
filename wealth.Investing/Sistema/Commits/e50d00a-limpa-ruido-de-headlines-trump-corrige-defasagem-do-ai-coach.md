---
type: commit
sha: e50d00a6fda1f3ca5f2583fbc3ec78d089a61100
sha7: e50d00a
date: "2026-04-15T01:47:10-03:00"
author: Pedro
commit_type: fix
scope: macro
files_changed: 4
insertions: 154
deletions: 33
tags: ["fix", "macro", "api", "lib"]
---

# fix(macro): limpa ruido de headlines Trump + corrige defasagem do AI Coach

> Commit por **Pedro** em 2026-04-15T01:47:10-03:00
> 4 arquivo(s) — +154 / −33

## Sessão

[[Sistema/Sessões/2026-04-15]]

## Arquivos tocados

- [[Sistema/Endpoints/app/api/ai/coach/route.ts|app/api/ai/coach/route.ts]]
- `lib/ai-prompts.ts` [[Sistema/Arquivos/lib/ai-prompts.ts|hub]]
- `lib/macro/headline-filter.ts` [[Sistema/Arquivos/lib/macro/headline-filter.ts|hub]]
- `lib/macro/scrapers/truth-social.ts` [[Sistema/Arquivos/lib/macro/scrapers/truth-social.ts|hub]]

## Mensagem

- headline-filter: adiciona blocklist (UFC, cerimonias, familia, esporte, entretenimento) aplicada apos whitelist
- headline-filter: remove do whitelist termos genericos que deixavam ruido passar (white house, press conference, national security, casa branca)
- truth-social: aperta TRUMP_KEYWORDS pro fallback Google News (so termos de mercado — tariff, sanctions, Iran, OPEC, Fed, oil, ceasefire...)
- truth-social: query do Google News mais focada em pares "Trump + termo financeiro"
- truth-social: roda isNoise() tambem na API Mastodon direta (filtra UFC/posts sociais)
- ai-prompts: MacroContext agora separa releasedEvents (ja sairam) de upcomingEvents (ainda por sair) + injeta nowIso (BR) como ground truth
- ai-prompts: instrucao explicita no system prompt — "nunca diga que um evento ja divulgado 'sai amanha'"
- coach route: classifica eventos via actual presente OU datetime ET < now; fim-de-dia ET p/ eventos sem hora

Corrige PPI sendo referenciado como "sai amanha" quando ja saiu horas antes.
