---
tags: [técnico, cron, sync, automação]
date: 2026-03-25
---

# Cron Jobs

## Jobs Ativos

| Job | Frequência | Função |
|-----|-----------|--------|
| calendar-sync | 30 min | Sync eventos ForexFactory |
| rates-sync | Após reuniões | Atualizar taxas de juros |
| headlines-sync | 30 min | Fetch RSS headlines |
| weekly-briefing | Semanal | Gerar briefing com Claude |

## Limitação Vercel Hobby

> [!warning] Cron Upgrade Pendente
> Vercel Hobby limita crons a execução **diária**.
> Para crons de 30 minutos, precisa upgrade para Pro ou alternativa.

## Alternativas Consideradas

1. **Vercel Pro** — Crons a cada 1 minuto
2. **Upstash QStash** — Cron as a service
3. **n8n** — Self-hosted workflows
4. **GitHub Actions** — Cron via CI/CD

Ver: [[Calendário Econômico]], [[Headlines ao Vivo]], [[Taxas de Juros]]

#técnico #cron #automação
