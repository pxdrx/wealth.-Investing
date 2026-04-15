---
tags: [aprendizado, macro, rates, bancos-centrais]
date: 2026-03-21
---

# Rates Manuais

## Lição

> **Taxas de bancos centrais devem ser verificadas manualmente, não automatizadas cegamente.**

## Contexto

Automação de scraping de taxas pode pegar dados errados se o formato da fonte mudar. Melhor ter dados corretos manualmente do que dados errados automaticamente.

## Implementação Atual

- Dados mantidos em `lib/macro/rates-fetcher.ts`
- Atualização manual após cada reunião de banco central
- Scraping como auxílio, não como fonte primária

Ver: [[Taxas de Juros]], [[Bancos Centrais]]

#aprendizado #macro #rates
