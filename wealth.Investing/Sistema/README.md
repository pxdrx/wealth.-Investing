---
tags: [sistema, memória, cérebro, index]
date: 2026-04-14
type: index
---

# 🧠 Sistema — Cérebro 24/7 do projeto

> Memória permanente, viva, automática. Cada commit, deploy, rota, endpoint, tabela e agente é um neurônio. As Sessões diárias são o batimento cardíaco.

## O que é isto?

Esta pasta é a **camada Sistema** do vault — o complemento automático das suas 50 notas semânticas (`Projeto/`, `Decisões/`, `Funcionalidades/`, `Aprendizados/`, `Técnico/`, etc).

- **Camada Semântica** (existente, curada por você): o que o projeto **significa**.
- **Camada Sistema** (esta, automática): o que o projeto **faz** e **fez**.

Juntas, formam o grafo-cérebro visível no graph view do Obsidian.

## Estrutura

| Pasta | Conteúdo | Origem |
|---|---|---|
| [[Sistema/Commits]] | 1 nota por commit (`<sha7>-<slug>.md`) | hook `post-commit` (determinístico) |
| [[Sistema/Sessões]] | 1 nota por dia — batimento cardíaco | hook + `/vault-enrich` |
| [[Sistema/Features]] | Clusters temáticos (AI Coach, Billing, Macro…) | `/vault-enrich` |
| [[Sistema/Bugs]] | 1 nota por commit `fix:` | backfill + `/vault-enrich` (root cause) |
| [[Sistema/Rotas]] | 1 nota por `app/**/page.tsx` | backfill |
| [[Sistema/Endpoints]] | 1 nota por `app/api/**/route.ts` + crons | backfill |
| [[Sistema/Tabelas]] | 1 nota por tabela Supabase | backfill |
| [[Sistema/Agentes]] | 1 nota por skill/subagent | backfill |
| [[Sistema/Dependências]] | 1 nota por lib do `package.json` | backfill |
| [[Sistema/Arquivos]] | Arquivos hub (5+ commits) | hook (promoção automática) |
| [[Sistema/Deploys]] | 1 nota por deploy Vercel | `/vault-enrich --deploy <id>` |

## Como é populado

### Automático (0 tokens)
- A cada `git commit`: hook `.git/hooks/post-commit` chama `node .claude/helpers/vault-sync-commit.mjs` e escreve:
  - Nova nota em `Sistema/Commits/`
  - Append na Sessão do dia
  - Bump de hit count em `Sistema/Arquivos/<file>.md` (promove a Hub em 5+ commits)

### Manual (tokens controlados)
- `/vault-enrich` — enriquece narrativa (Features, Bugs root cause, Sessões como parágrafo).
- `/vault-enrich --deploy <vercel-id>` — registra deploy.
- `/vault-enrich --backfill --batch N` — processa slice de 50 commits (backfill inicial em ~10 batches).

## Convenções

- **Wikilinks densos**: cada nota Sistema tem ≥5 links saindo.
- **Frontmatter padronizado**: `type`, `date`, `tags`, mais campos específicos do tipo.
- **Não editar manualmente** notas em `Commits/`, `Arquivos/`, `Rotas/`, `Endpoints/`, `Agentes/`, `Dependências/` — elas são regeneráveis.
- **Features e Bugs**: pode editar à mão; o enrich preserva seções customizadas quando detecta.

## Para futuras sessões Claude

**Antes de buscar contexto histórico no chat**, consulte esta pasta:
- Quer saber o que foi feito num dia? `Sistema/Sessões/YYYY-MM-DD.md`.
- Quer o estado atual de uma feature? `Sistema/Features/<Nome>.md`.
- Procurando bug similar? `Sistema/Bugs/`.
- Qual endpoint faz X? `Sistema/Endpoints/`.

Cruze com a camada Semântica (`Funcionalidades/`, `Decisões/`, `Aprendizados/`) via os wikilinks já presentes.

## Hubs que você vai encontrar grandes no grafo

Hubs semânticos (dourado/verde-escuro), crescendo conforme Sistema linka:
- [[Funcionalidades/AI Coach]]
- [[Funcionalidades/Billing Stripe]]
- [[Decisões/MVP Revenue Design]]
- [[Decisões/Macro Intelligence]]
- [[Projeto/Overview]]
- [[Projeto/Stack Técnico]]

Hubs Sistema (amarelo/vermelho/verde), crescendo com o tempo:
- Sessões com mais commits
- Features mais tocadas
- Bugs recorrentes

---

> [!tip] Visualizar o cérebro
> Abra graph view (`Ctrl+G`) → veja os lobos coloridos. Use os filtros salvos:
> - **Cérebro completo** — tudo
> - **Só semântico** — vault original sem a camada automática
> - **Só Sistema** — apenas a memória automática
