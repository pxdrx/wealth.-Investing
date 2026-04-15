---
tags: [técnico, supabase, database, schema, rls]
date: 2026-03-25
---

# Supabase Schema

## Tabelas

### Core

| Tabela | Função |
|--------|--------|
| `profiles` | `user_id`, `display_name` |
| `accounts` | `id`, `user_id`, `name`, `kind` (prop/personal/crypto), `is_active` |
| `prop_accounts` | `account_id`, `firm_name`, `phase`, `starting_balance_usd`, `drawdown_type` |
| `journal_trades` | `id`, `account_id`, `user_id`, `symbol`, `direction`, `pnl_usd`, `net_pnl_usd` |
| `day_notes` | `id`, `user_id`, `date`, `content`, `mood` |

### Integrações

| Tabela | Função |
|--------|--------|
| `tv_alerts` | `user_id`, `symbol`, `alert_type`, `timeframe`, `message`, `payload` |
| `prop_payouts` | `account_id`, `amount_usd`, `paid_at` |
| `wallet_transactions` | `amount_usd`, `tx_type`, `notes` |
| `ingestion_logs` | Import tracking com timing e counts |

### Billing

| Tabela | Função |
|--------|--------|
| `subscriptions` | `user_id`, `stripe_customer_id`, `tier`, `status` |

### Macro Intelligence

| Tabela | Função |
|--------|--------|
| `economic_events` | Calendário econômico (ForexFactory) |
| `central_bank_rates` | Taxas de 10 bancos centrais |
| `macro_headlines` | Headlines traduzidas PT-BR |
| `weekly_panoramas` | Briefing semanal com AI |

### Alertas

| Tabela | Função |
|--------|--------|
| `prop_alerts` | Alertas de drawdown |
| `adaptive_alerts` | Alertas customizáveis |

## RLS

- **Todas as tabelas** têm RLS ativo
- Queries sempre usam `.eq("user_id", session.user.id)`
- Validação completa em auditoria de 2026-03-10 (8/8 tabelas OK)

## Query Conventions

- `.maybeSingle()` para lookups que podem retornar null
- `.single()` **NUNCA** para queries que podem retornar null
- Checar `error` antes de usar `data`
- Account sorting: `is_active DESC` → kind → `created_at ASC`
- PGRST116 = "no rows found" → tratar como null

Ver: [[Arquitetura]], [[API Routes]]

#técnico #supabase #database


## analyst_reports
- `id` (uuid pk)
- `user_id` (uuid, FK auth.users)
- `ticker` (text)
- `asset_type` (text)
- `report` (jsonb) — relatório completo
- `created_at` (timestamptz)
- RLS: users read/insert/delete own

Usado pelo [[Funcionalidades/Analista de Ativos|Analista Dexter]].