---
tags: [aprendizado, git, deploy, vercel]
date: 2026-03-20
---

# Sempre Commit e Push

## Lição

> **NUNCA perguntar, apenas fazer.** Deploy é automático via Vercel.

## Contexto

Vercel detecta push para `main` e faz deploy automático. Código commitado mas não pushado = código que não existe em produção.

## Regra

Após qualquer commit:
1. `git push` imediatamente
2. Não esperar aprovação
3. Não perguntar se deve fazer push

## Exceção

Nenhuma. Todo código commitado em main deve ir para produção.

#aprendizado #git #deploy
