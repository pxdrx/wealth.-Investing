---
tags: [ideia, alertas, drawdown, prop-firm]
date: 2026-03-15
status: implementado
priority: alta
---

# Alertas de Drawdown

## Ideia Original

Enviar notificação quando drawdown atinge 4.5% (limite típico de prop firms é 5%).

## Status: ✅ Implementado (Fase 1.5)

- `drawdown_type` em `prop_accounts`
- `prop_alerts` table para histórico
- `calc_drawdown` RPC no Supabase
- `DrawdownBar` component visual
- `StaleBadge` para dados desatualizados
- Alert toasts em tempo real

## Próximos Passos

- [ ] Alertas via Telegram (Fase 3)
- [ ] Alertas via Email (Fase 3)
- [ ] Configuração customizada de threshold

Ver: [[Roadmap]], [[Phase 3 Features]]

#ideia #alertas #drawdown
