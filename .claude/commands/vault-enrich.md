---
description: Enriquece a camada Sistema do vault Obsidian com narrativa (Features, Bugs, Sessões). Token-aware.
argument-hint: [--backfill --batch N | --deploy <vercel-id>]
---

# /vault-enrich

Você é o **curador do cérebro** do projeto. Sua missão: transformar os nós cruos `wealth.Investing/Sistema/` (criados pelo hook `post-commit` e pelo backfill determinístico) em **narrativa densa e interligada**, mantendo a densidade do grafo "cérebro 24/7".

## Contexto obrigatório (leia antes de agir)

1. `wealth.Investing/Sistema/README.md` — arquitetura da camada Sistema
2. `wealth.Investing/Home.md` — hubs semânticos existentes
3. `MEMORY.md` e `CLAUDE.md` — memória de projeto e convenções
4. `wealth.Investing/Sistema/.last-enrich` (se existir) — timestamp do último enrich

## Modos

Leia `$ARGUMENTS` para decidir:

### Modo 1 — Incremental (default, sem args)

1. Lê `Sistema/.last-enrich` (ISO date). Se não existir, usa ontem.
2. Lista `Sistema/Commits/*.md` criadas depois dessa data (via frontmatter `date:`).
3. Agrupa commits por **cluster temático** (mesmo escopo/arquivo/feature).
4. Para cada cluster:
   - Se o cluster corresponde a uma Feature conhecida (AI Coach, Billing, Macro, Landing, Mentor, Journal, Auth), atualiza `Sistema/Features/<nome>.md` (cria se não existir) com:
     - Frontmatter: `type: feature`, `tags: [feature, <escopo>]`, `last_commit: <sha7>`, `commits_count: N`
     - Seções: **O que é** (1 parágrafo), **Commits recentes** (wikilinks a `Sistema/Commits/*`), **Rotas** (wikilinks a `Sistema/Rotas/*`), **Endpoints**, **Tabelas**, **Relacionado** (wikilinks a `Funcionalidades/*`, `Decisões/*`, `Técnico/*` existentes).
5. Para cada commit `fix:`, abre `Sistema/Bugs/<sha7>-<slug>.md` (já criado cru pelo backfill) e preenche a seção "Root cause" analisando o diff (`git show <sha>`).
6. Para cada dia com commits, reescreve `Sistema/Sessões/<YYYY-MM-DD>.md` como **narrativa curta** (3-5 parágrafos): "O que aconteceu neste dia, por quê, e o que ficou diferente." Mantém a lista de commits no final.
7. Escreve `Sistema/.last-enrich` com a data atual ISO.

**Budget esperado:** 5-15k tokens por execução (dias normais, <20 commits novos).

### Modo 2 — Deploy (`--deploy <vercel-id>`)

1. Usa o argumento `<vercel-id>` como identificador (usuário copia do dashboard Vercel).
2. Pergunta ao usuário quais commits fazem parte desse deploy (ou infere pelos últimos N commits desde o último deploy registrado).
3. Cria `Sistema/Deploys/<id>.md` com:
   - Frontmatter: `type: deploy`, `vercel_id`, `date`, `status`, `url_preview`
   - Seções: **Commits incluídos** (wikilinks), **Features afetadas** (wikilinks a `Sistema/Features/*`), **Notas de release** (narrativa).

### Modo 3 — Backfill (`--backfill --batch N`)

Processa batch de 50 commits (ordenado cronologicamente) no backfill inicial.

1. Lê todos os `Sistema/Commits/*.md` e ordena por `date:` crescente.
2. Calcula `startIdx = (N-1) * 50`, `endIdx = N * 50`.
3. Aplica o pipeline do **Modo 1** apenas nesse slice.
4. Extrai de `MEMORY.md` os nomes de Features já conhecidos (Forensic Audit, MVP Revenue, Macro Intelligence, AI Coach, Billing MVP, Site Audit, Background Off-White, Landing Redesign, Mentor Panel, etc) e cria/enriquece `Sistema/Features/<nome>.md` uma vez (no batch 1), linkando commits conforme aparecem nos batches subsequentes.
5. Ao terminar o batch, imprime: "Batch N/M concluído — próximo: `/vault-enrich --backfill --batch N+1`."

**Budget por batch:** ~20-30k tokens. Total backfill (10 batches): ~250-300k tokens distribuíveis.

## Regras

- **Nunca reescrever a camada Semântica** (`wealth.Investing/{Projeto,Decisões,Funcionalidades,Aprendizados,Técnico,Ideias,Mercado,Instagram,Diário,Referências}/`). Apenas ler e linkar.
- **Sempre usar wikilinks** no formato `[[Pasta/Nota]]` ou `[[Pasta/Nota|alias]]`.
- **Densidade mínima**: cada nota Sistema nova deve ter ≥5 wikilinks saindo.
- **Preservar frontmatter existente**: ao atualizar uma nota, mantém frontmatter customizado, só atualiza campos automatizados (`last_commit`, `commits_count`, `tags`).
- **Idempotência**: rodar 2x não deve duplicar conteúdo.
- **Logs**: ao final, reporte contagem de nós criados/atualizados e estimativa de tokens consumidos.

## Ordem de execução

1. Leia contexto obrigatório.
2. Use TaskCreate para trackear as etapas do modo escolhido.
3. Execute batch de leituras em paralelo (Read múltiplos `Sistema/Commits/*.md`).
4. Escreva/atualize notas com Edit/Write.
5. Atualize `Sistema/.last-enrich`.
6. Resuma.
