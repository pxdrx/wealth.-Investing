# Ultra Tier Differentiation — Design Spec

> **Goal:** Reposicionar o plano Ultra como "copiloto ativo" vs Pro como "ferramenta de análise", criando urgência de upgrade através de features que trabalham pelo trader.

## Filosofia de Tiers

- **Free** = Registrar (journal básico, calendário econômico)
- **Pro** = Analisar (relatórios, macro, AI Coach básico)
- **Ultra** = Agir com inteligência (Dexter, Coach premium, alertas que antecipam erros)

**O Pro dá dados. O Ultra dá decisões.**

---

## Feature Matrix Atualizada

| Feature | Free | Pro | Ultra |
|---------|------|-----|-------|
| Journal + Import MT5 | 10 trades/mês | Ilimitado | Ilimitado |
| Contas | 1 | 5 | Ilimitadas |
| Calendário Econômico | Sim | Sim | Sim |
| Macro Intelligence | Só calendário | Completo | Completo |
| Backtest | - | Sim | Sim |
| AI Coach | - | 10 msg/mês (Haiku) | 300 msg/mês (Sonnet) + contexto dos trades |
| **Analista Dexter** | - | - | **Exclusivo** |
| **Alertas Inteligentes** | - | - | **Exclusivo** (novo) |
| Psicologia | - | Sim | Sim + insights IA |
| Relatórios | - | Básicos + CSV | Avançados + PDF |
| Regenerar briefing macro | - | - | Exclusivo |

---

## Mudança 1: Dexter → Ultra Only

### O que muda
- Analista Dexter (5 agentes IA em paralelo) sai do tier Pro e vira exclusivo Ultra
- PaywallGate no `/app/analyst` muda de `requiredPlan="pro"` para `requiredPlan="ultra"`
- Sidebar continua mostrando "Analista Dexter" para Pro users, mas com badge de cadeado Ultra
- Ao clicar, Pro user vê PaywallGate com copy: "O Analista Dexter é exclusivo do plano Ultra. 5 agentes de IA analisam qualquer ativo em 30 segundos."

### Arquivos afetados
- `app/app/analyst/page.tsx` — mudar PaywallGate para `requiredPlan="ultra"`
- `lib/subscription-shared.ts` — mover `analyst` de pro para ultra nos limites
- `components/billing/PricingCards.tsx` — atualizar feature list

---

## Mudança 2: AI Coach Diferenciado por Tier

### Pro (Haiku)
- Modelo: `claude-haiku-4-5-20251001`
- 10 mensagens/mês
- Contexto: responde perguntas genéricas sobre trading
- Badge visual: "Coach" (neutro)

### Ultra (Sonnet)
- Modelo: `claude-sonnet-4-6` (ou mais recente)
- 300 mensagens/mês
- Contexto: acessa trades reais do usuário, padrões identificados, dados de psicologia
- Badge visual: "Coach Pro" com badge dourado/premium
- System prompt enriquecido com dados reais do trader

### Arquivos afetados
- `app/api/ai/coach/route.ts` — selecionar modelo baseado no tier
- `lib/subscription-shared.ts` — limites já existentes, só confirmar
- `components/ai-coach/` — badge visual diferenciado
- System prompt do Coach Ultra: incluir resumo de trades, win rate, padrões

---

## Mudança 3: Alertas Inteligentes (feature nova — Ultra only)

### Conceito
Motor que analisa os trades do usuário e detecta padrões negativos, gerando alertas preventivos no dashboard. O trader recebe avisos antes de cometer erros recorrentes.

### Alertas v1 (5 tipos)

1. **Streak de perdas** — "Você perdeu 3x seguidas. Considere parar por hoje."
   - Trigger: 3+ losses consecutivos no dia
   - Dados: `journal_trades` filtrado por dia, ordenado por `opened_at`

2. **Ativo tóxico** — "Suas últimas 5 operações em XAUUSD resultaram em loss. Revise seu setup."
   - Trigger: 5+ losses consecutivos no mesmo symbol
   - Dados: `journal_trades` agrupado por `symbol`, últimos N trades

3. **Horário problemático** — "Seu win rate das 14h-16h é 23%. Seus melhores horários são 9h-11h."
   - Trigger: win rate < 30% em uma faixa horária com 10+ trades
   - Dados: `journal_trades` agrupado por hora de `opened_at`

4. **Drawdown acelerado** — "Você está a 2% do limite diário. Atenção."
   - Trigger: drawdown diário > 80% do limite configurado
   - Dados: `prop_accounts` limites + `journal_trades` P&L do dia

5. **Overtrading** — "Você fez 15 trades hoje, média é 6. Volume atípico."
   - Trigger: trades do dia > 2x da média dos últimos 30 dias
   - Dados: `journal_trades` count por dia

### Arquitetura

```
┌─────────────────────────────────┐
│  SmartAlertEngine (lib/)        │
│  - analyzeStreak()              │
│  - analyzeToxicAsset()          │
│  - analyzeTimePattern()         │
│  - analyzeDrawdown()            │
│  - analyzeOvertrading()         │
│  Cada função recebe trades[]    │
│  e retorna Alert[] | null       │
└──────────────┬──────────────────┘
               │
┌──────────────▼──────────────────┐
│  SmartAlertsBanner (component)  │
│  - Mostra no topo do Dashboard  │
│  - Dismissável (sessionStorage) │
│  - Ícone de sino com badge      │
│  - Ultra-only (PaywallGate)     │
└─────────────────────────────────┘
```

### Onde aparece
- **Dashboard**: Banner no topo (abaixo do ticker tape, acima dos widgets)
- **Sidebar**: Badge numérico no ícone de alerta (se houver alertas ativos)
- Pro users veem um teaser blur: "Alertas Inteligentes — disponível no Ultra"

### Cálculo
- Client-side puro (sem API) — roda no browser com os trades já carregados
- Recalcula quando trades mudam (useMemo)
- Sem persistência — alertas são efêmeros, recalculados a cada visita

### Arquivos novos
- `lib/smart-alerts.ts` — engine de análise (5 funções puras)
- `components/dashboard/SmartAlertsBanner.tsx` — UI do banner

### Arquivos modificados
- `app/app/page.tsx` — renderizar SmartAlertsBanner no dashboard
- `components/layout/AppSidebar.tsx` — badge de alerta
- `components/billing/PricingCards.tsx` — feature list atualizada

---

## Mudança 4: Atualizar PricingCards

### Feature lists nos cards

**Pro:**
- Journal ilimitado + Import MT5
- 5 contas simultâneas
- Inteligência Macro completa
- AI Coach (10 msg/mês)
- Relatórios + CSV export
- Análise psicológica
- Backtest

**Ultra (destacar diferença):**
- Tudo do Pro, mais:
- **Analista Dexter** — 5 agentes IA em paralelo
- **Alertas Inteligentes** — detecta padrões antes de você errar
- **AI Coach Premium** (Sonnet) — 300 msg/mês com contexto dos seus trades
- Contas ilimitadas
- PDF export
- Regenerar briefing macro sob demanda

### Copy do card Ultra
Headline: "Para quem leva trading a sério"
Subline: "Seu copiloto de IA que trabalha por você, mesmo quando você não está olhando."

---

## Prioridade de Implementação

1. **Dexter → Ultra only** (5 min — mudar 1 prop no PaywallGate)
2. **AI Coach diferenciado** (30 min — model selection + badge)
3. **PricingCards atualizado** (15 min — textos e features)
4. **Alertas Inteligentes** (2-3h — engine + banner + sidebar badge)

---

## Métricas de Sucesso

- Conversão Free→Pro mantém ou sobe (Coach como droga de entrada)
- Conversão Pro→Ultra sobe (Dexter + Alertas como pull)
- Churn Ultra desce (alertas criam hábito diário)
