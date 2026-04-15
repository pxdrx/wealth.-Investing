---
tags: [feature, macro, taxas, bancos-centrais]
date: 2026-03-25
status: ativo
tier: pro
---

# Taxas de Juros

## Visão Geral

Painel com taxas de juros de **10 bancos centrais**, atualizado via scrape do Trading Economics. Tier **Pro+** apenas.

## Bancos Centrais

Ver: [[Bancos Centrais]] para lista completa.

| Banco | Moeda |
|-------|-------|
| FED | USD |
| ECB | EUR |
| BOE | GBP |
| BOJ | JPY |
| BCB | BRL |
| BOC | CAD |
| RBA | AUD |
| PBOC | CNY |
| SNB | CHF |
| BANXICO | MXN |

## Schema

```sql
central_bank_rates (
  id, bank_code, bank_name, currency,
  current_rate, previous_rate,
  next_meeting, last_updated
)
```

## Smart Update

Após cada reunião de banco central, o sistema atualiza a taxa automaticamente. Entre reuniões, mantém dados estáticos.

> [!warning] Rates Manuais
> Taxas de bancos centrais devem ser **verificadas manualmente** antes de publicar.
> Automação cega pode mostrar dados errados.
> Ver: [[Rates Manuais]]

## Fonte

- Trading Economics (scrape)
- Dados mantidos em `lib/macro/rates-fetcher.ts`

Ver: [[Bancos Centrais]], [[Macro Intelligence]]

#feature #macro #taxas
