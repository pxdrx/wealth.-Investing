---
type: commit
sha: b994911f66593a5c8cd129f58e29ac2d10aee9fd
sha7: b994911
date: "2026-04-15T02:27:28-03:00"
author: Pedro
commit_type: feat
scope: psychology
files_changed: 4
insertions: 211
deletions: 217
tags: ["feat", "psychology", "api", "ui"]
---

# feat(psychology): 1 analise por dia + loading animado estilo Dexter

> Commit por **Pedro** em 2026-04-15T02:27:28-03:00
> 4 arquivo(s) — +211 / −217

## Sessão

[[Sistema/Sessões/2026-04-15]]

## Arquivos tocados

- [[Sistema/Endpoints/app/api/ai/psychology/route.ts|app/api/ai/psychology/route.ts]]
- `components/journal/PsychologyAnalysis.tsx` [[Sistema/Arquivos/components/journal/PsychologyAnalysis.tsx|hub]]
- `components/journal/PsychologyLoadingAnimation.tsx` [[Sistema/Arquivos/components/journal/PsychologyLoadingAnimation.tsx|hub]]
- `supabase/migrations/20260415_psychology_cache_daily.sql` [[Sistema/Arquivos/supabase/migrations/20260415_psychology_cache_daily.sql|hub]]

## Mensagem

UX:
- Aba Psicologia agora gera analise automaticamente ao entrar (sem botao)
- Mesma analise mostrada o dia inteiro; reseta a meia-noite (fuso BR)
- 1 analise por dia POR PERIODO (7d/30d/90d/all) — trocar periodo gera nova
- Botao "Refazer Analise" removido (cache eh por dia, sem regenerar manual)

Loading novo (PsychologyLoadingAnimation.tsx):
- CpuArchitecture com luzes coloridas piscando em paths animados
- Mensagem rotativa a cada 2.5s: "Observando trades" → "Analisando comportamento"
  → "Mapeando padroes de tilt" → "Detectando revenge trading" → ...
- Barra de progresso assintotica (gradiente indigo→fuchsia→pink, converge ~95%)

Backend (route.ts):
- Cache key inclui cache_date (YYYY-MM-DD em America/Sao_Paulo)
- Lookup por (user_id, account_id, period, cache_date=hoje) → cache hit instantaneo
- Removido param 'force' e rate limit de 3/dia; novo cap de 20/dia user-wide
- Migration adiciona coluna cache_date + indice composto

REQUER: supabase db push pra aplicar 20260415_psychology_cache_daily.sql
