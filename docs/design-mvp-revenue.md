# wealth.Investing — Design Document: MVP Revenue

**Status:** APPROVED (Multi-Agent Review)
**Date:** 2026-03-16
**Author:** Primary Designer + Multi-Agent Brainstorming Review

---

## 1. Understanding Summary

### O que está sendo construído
**wealth.Investing** — trading journal SaaS posicionado como "o escudo do trader", com prop firm rule engine, AI Coach acessível, e dashboard multi-account consolidado. Foco inicial no mercado brasileiro.

### Por que existe
- Nenhum journal dominante é prop-firm-first (todos são genéricos)
- Mercado PT-BR = zero concorrência
- AI insights custam $80/mo no TraderSync — oportunidade de oferecer a R$79,90 (~$16 USD)
- Traders sofrem com: drawdown sem alerta, falta de análise de padrões, fricção no import

### Para quem
- **Core:** Traders de prop firms (FTMO, The5ers, Apex)
- **Secundário:** Forex/futuros em conta pessoal
- **Terciário:** Crypto traders
- **Base inicial:** ~2.800 membros da SML (Smart Money Lab, Discord)

### Modelo de negócio
- Recorrência mensal (cartão + Pix recorrente via Stripe BR)
- Começa em BRL, estrutura preparada pra USD/internacional
- Fallback: Mercado Pago ou Asaas se Stripe Pix tiver problemas

### Parceria SML
- Co-branding: "journal oficial da SML"
- Acesso diferenciado pra membros (desconto ou tier exclusivo)
- Integração de conteúdo dos mentores (vídeos, calls) no tier Elite
- **Precisa ser formalizada na Fase 0**

### Non-goals
- Não é rede social de traders
- Não é plataforma de curso
- Não é copy trading / signals service
- Não é corretora / execution

---

## 2. Pricing

| | Free | Pro (R$79,90/mo) | Elite (R$139,90/mo) |
|---|---|---|---|
| Anual (20% off) | Free | R$63,90/mo | R$111,90/mo |
| Trades/mês | 30 | Ilimitados | Ilimitados |
| Contas | 2 | 5 | Ilimitadas |
| Import MT5/MT4 | Upload manual | Drag & drop + preview | Auto-import (quando disponível) |
| cTrader | 🔒 | ✅ | ✅ |
| Dashboard | Minha conta | + Visão geral | + Comparativo por conta |
| Drawdown tracking | Visual simples | Alertas nos thresholds | Alertas + regras custom |
| AI Coach | 1 análise grátis (signup) | 10/mês | 5/dia (~150/mês) |
| Conteúdo SML | — | — | Vídeos dos mentores |
| Suporte | Community | Email | Prioritário |
| Export CSV | 🔒 | ✅ | ✅ |

**Nota:** "Auto-import" e "real-time" só aparecem no pricing quando efetivamente implementados. Sem claims enganosos.

---

## 3. Payments Stack

### Stripe como processador principal
- Stripe BR: card + Pix nativo via `payment_method_types: ['card', 'pix']`
- Stripe Subscriptions para recorrência
- Stripe Customer Portal para self-service (cancelar, trocar tier, atualizar cartão)
- Webhooks do Stripe → Supabase para sincronizar status
- **Fallback:** Mercado Pago ou Asaas se Stripe Pix tiver problemas no BR

### Tabela: `subscriptions`
```sql
CREATE TABLE subscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  stripe_customer_id TEXT NOT NULL,
  stripe_subscription_id TEXT NOT NULL,
  plan TEXT CHECK (plan IN ('free', 'pro', 'elite')) DEFAULT 'free',
  status TEXT CHECK (status IN ('active', 'canceled', 'past_due', 'trialing')) DEFAULT 'active',
  current_period_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);
-- RLS obrigatório
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own subscription" ON subscriptions FOR SELECT USING (auth.uid() = user_id);
```

### Webhook Security
- Usar `stripe.webhooks.constructEvent()` com signing secret (NÃO custom header)
- Coluna `stripe_event_id` para idempotency (dedup de retries)
- Endpoint: `POST /api/webhooks/stripe`

### Tier Gating no App
- `SubscriptionContext` (similar ao `ActiveAccountContext`)
- Hook `useSubscription()` → `{ plan, isProOrAbove, isElite, limits }`
- Componente `<PaywallGate plan="pro">` que wrapa features premium
- Server-side: API routes validam tier via `subscriptions` table antes de processar
- Client state: Supabase Realtime no canal `subscriptions` ou poll a cada 5 min

### Fluxo de Compra
1. User clica "Assinar" na pricing page ou no paywall in-app
2. Redirect pra Stripe Checkout (hosted) com Pix + cartão
3. Stripe webhook `checkout.session.completed` → insere/atualiza `subscriptions`
4. Redirect para `/app/subscription/success` com confirmação visual
5. App recarrega subscription via `useSubscription()`

### Fluxo de Cancelamento
- "Gerenciar assinatura" → Stripe Customer Portal
- Webhook `customer.subscription.deleted` → atualiza status para 'canceled'
- Acesso mantido até `current_period_end`

---

## 4. Prop Rule Engine & Drawdown Alerts

### Dados existentes (prop_accounts)
```
firm_name, phase, starting_balance_usd, profit_target_percent,
max_daily_loss_percent, max_overall_loss_percent, reset_timezone, reset_rule
```

### Nova coluna
- `drawdown_type` (enum: `static` | `trailing`)

### Nova tabela: `prop_alerts`
```sql
CREATE TABLE prop_alerts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  account_id UUID REFERENCES accounts(id) NOT NULL,
  alert_type TEXT CHECK (alert_type IN ('daily_limit', 'overall_limit', 'profit_target')),
  threshold_percent INT CHECK (threshold_percent IN (70, 80, 90)),
  triggered_at TIMESTAMPTZ DEFAULT now(),
  acknowledged BOOLEAN DEFAULT false
);
-- RLS obrigatório
```

### UX
- **Barra de drawdown** com 3 zonas: verde (<50%), amarelo (50-80%), vermelho (>80%)
- **Badge "Última atualização: X horas"** — amarelo se >24h (segurança)
- **Toast notifications** quando cruza 70%, 80%, 90%
- **Alerta persistente** no topo quando >80%
- **Som opcional** (toggle nas settings)

### Cálculo
- Drawdown diário: Postgres function com filtro por data + timezone
- Drawdown overall: soma de `net_pnl_usd` desde início do ciclo vs. `starting_balance_usd`
- **Filtro de 90 dias default** para evitar queries unbounded

### Prop Account Resets
- Quando trader falha challenge e reinicia → cria nova conta no app
- Conta antiga fica arquivada com histórico intacto

---

## 5. AI Coach

### Tipos de análise

**1. Análise de sessão (após import)**
> "Hoje você operou 7 trades com win rate de 42%..."

**2. Análise semanal (gerada todo domingo)**
> "Sua melhor sessão é Londres (08-12h UTC)..."

**3. Pergunta livre (chat)**
> User: "Por que estou perdendo no ouro?"

### Arquitetura

**API Route: `POST /api/ai/coach`**
- Body: `{ type: "session" | "weekly" | "chat", message?: string, account_id }`
- Auth: Bearer token
- Tier check: Free = 1 (signup gift), Pro = 10/mês, Elite = 5/dia

**Pre-agregação de dados (não enviar raw trades):**
- Resumo: win rate por par, por sessão, por dia da semana
- Sequências: streaks de win/loss
- Métricas: profit factor, avg RR, avg duration
- Últimos 90 dias, agrupados

**Modelo:** Claude Haiku (~$0.01-0.03 por análise)
- Custo Pro (10/mês): ~$0.30/user/mês
- Custo Elite (150/mês max): ~$4.50/user/mês → margem de ~96.8%

### Tabela: `ai_usage`
```sql
CREATE TABLE ai_usage (
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  month TEXT NOT NULL, -- '2026-03'
  usage_count INT DEFAULT 0,
  last_used_at TIMESTAMPTZ,
  PRIMARY KEY (user_id, month)
);
-- RLS obrigatório
```

### UX
- Aba "AI Coach" no journal
- Skeleton: "Seu mentor está analisando..."
- Retry button se falhar
- Error toast se timeout
- Badge "7/10 análises restantes" (Pro)
- 1 análise grátis no signup (Free) para demonstrar valor

---

## 6. Dashboard Consolidado

### Visão "Minha Conta" (Free+)
- KPIs da conta ativa (P&L, win rate, profit factor)
- Equity curve
- Calendário com P&L diário

### Visão "Visão Geral" (Pro+)
- **Header:** Capital Total Funded | Total Sacado | P&L Mês
- **Tabela de contas:** firma, fase, P&L mês, drawdown diário/total, status
- **Equity curve consolidada** com toggle "Todas / Por conta"
- **Ordenação:** contas em risco primeiro (drawdown mais alto no topo)

### Gating
- Free: vê "Visão Geral" dos últimos 7 dias. Histórico com blur + paywall.
- Pro: visão geral completa
- Elite: + comparativo por conta (equity curves separadas)

---

## 7. Import Melhorado

### Quick Wins
- Drag & drop zone (substituir input file)
- Preview de 5 trades antes de confirmar
- Barra de progresso
- **Relatório de discrepância:** linhas puladas com motivo

### Feedback pós-import
- "14 trades importados, 3 duplicatas ignoradas, 2 linhas puladas (motivo: formato inválido)"
- Se Pro/Elite: botão "Analisar com AI Coach"
- Se Free e >30 trades/mês: paywall suave

### Parsers
- MT5 HTML (existe, precisa fix na Fase 0)
- MT4 HTML (testar na Fase 0 — formato similar)
- cTrader CSV (Fase 2)

---

## 8. Onboarding Expandido

**Step 1 — Nome** (já existe)
> "Como quer ser chamado?"

**Step 2 — Perfil de trader** (novo)
> "O que melhor descreve você?" → prop / pessoal / crypto / mix

**Step 3 — Suas contas** (novo)
> Se prop: "Qual firma?" → preset auto-preenchido
> Botão grande: "Não sei, configurar depois"
> Timezone auto-detectado via `Intl.DateTimeFormat().resolvedOptions().timeZone`

**Step 4 — Primeiro import** (novo)
> Drop zone para primeiro relatório
> Skip: "Explorar primeiro"

**Dados salvos:**
- Nova coluna em `profiles`: `trader_type`, `display_currency`, `timezone`

---

## 9. Landing Page Atualizada

### Hero
- Copy: "Proteja seu capital. Domine seus padrões. Saque mais do mercado."
- Sub: "O journal de trading que monitora suas regras, analisa seus erros com IA, e consolida todas as suas contas em um só lugar."

### Seções
- Trust bar: plataformas + "Parceiro da Smart Money Lab"
- Benefícios (sem métricas falsas): alertas de drawdown, AI Coach, multi-account
- Pricing integrado (componente shadcn com 3 tiers, toggle anual + confetti)
- Seção SML com quote de Wagner/Hiran
- CTA: "Comece grátis" → signup / "Assinar Pro" → checkout

---

## 10. Settings Page

### Perfil
- Display name, email (read-only), trader type, timezone

### Assinatura
- Plano atual com badge
- Status, renovação, método de pagamento
- "Gerenciar assinatura" → Stripe Customer Portal
- AI Coach usage (Pro): "7/10 análises usadas"

### Preferências
- Theme (light/dark/system)
- Som de alertas (on/off)
- Idioma (PT-BR / EN — preparação i18n)

### Danger Zone
- Cancelar assinatura → Customer Portal
- Excluir conta → modal com input "EXCLUIR" → soft delete 30 dias → hard delete (cron job)

---

## 11. Roadmap por Fases

### Fase 0 — Pré-requisitos (antes de monetizar)
- [ ] Formalizar parceria SML (contato Wagner/Hiran)
- [ ] Survey de validação com 20-30 membros SML
- [ ] Fix MT5 HTML parser com 5+ relatórios reais
- [ ] Testar parser com relatórios MT4
- [ ] Fix account creation flow
- [ ] Fix TradingView webhook (anon key + RLS)
- [ ] Remover todos os dados mock
- [ ] Smoke test E2E: login → criar conta → importar → dashboard

### Fase 1 — MVP Monetizável
- [ ] Billing system (Stripe + Pix, subscriptions table)
- [ ] Stripe webhook com idempotency + signature
- [ ] SubscriptionContext + useSubscription() + PaywallGate
- [ ] Pricing page (componente shadcn, 3 tiers, toggle anual)
- [ ] Subscription success page
- [ ] Settings page com gerenciamento de assinatura
- [ ] RLS em todas as novas tabelas
- [ ] Sentry free tier integrado
- [ ] Onboarding expandido (4 steps)

### Fase 1.5 — Rule Engine
- [ ] Prop Rule Engine + drawdown_type column
- [ ] Drawdown alerts (prop_alerts table, toasts, barras de cor)
- [ ] Badge "última atualização" com warning de stale data
- [ ] Postgres function pra cálculo de drawdown (filtro 90 dias)

### Fase 2 — AI Coach & Polish
- [ ] AI Coach via Claude API (session, weekly, chat)
- [ ] Pre-agregação de dados de trades
- [ ] ai_usage table + rate limiting por tier
- [ ] 1 análise grátis no signup
- [ ] Dashboard "Visão Geral" consolidado (Pro+)
- [ ] Import melhorado (drag & drop, preview, discrepancy report)
- [ ] Landing page atualizada (copy, pricing, SML badge)
- [ ] cTrader parser

### Fase 3 — Growth & Expansão
- [ ] Email parser para auto-import (Elite)
- [ ] File watcher desktop companion (se viável)
- [ ] Affiliate program pra membros SML
- [ ] Conteúdo dos mentores integrado (Elite)
- [ ] i18n (EN) + pricing USD
- [ ] API sync com prop firms (quando disponível)
- [ ] display_currency field + currency handling
- [ ] LGPD hard delete cron job

---

## 12. Decision Log

| # | Decisão | Alternativas | Razão |
|---|---------|-------------|-------|
| 1 | Posicionamento: escudo do trader em geral | Prop-only, AI-first, community-first | Abrange toda a SML sem limitar mercado |
| 2 | Parceria SML co-branding | White-label, affiliate puro | Mais simples, benefício mútuo |
| 3 | Pricing: Free / R$79,90 / R$139,90 | $29/$49 USD, one-time | Preço BR competitivo, recorrência |
| 4 | Stripe como gateway (card + Pix) | Mercado Pago, Asaas | Stripe BR Pix nativo + prepara USD |
| 5 | Stripe Hosted Checkout | Embedded, custom form | Menos código, PCI compliance |
| 6 | AI Coach com Claude Haiku | Sonnet, GPT-4, determinístico | Custo ~$0.01-0.03, margem >96% |
| 7 | File watcher para auto-import | Scraping prop firms, email parser | Mais confiável, sem risco legal |
| 8 | Onboarding 4 steps | Só display_name | Ativação: TradeZella 28%→65% |
| 9 | Fase 0 obrigatória antes de monetizar | Lançar com bugs | Não cobrar com core quebrado |
| 10 | BR first, i18n depois | Global desde dia 1 | Oceano azul BR, escala depois |
| 11 | Pricing shadcn + confetti | Custom design | Stack fit, user escolheu |
| 12 | Dashboard consolidado gated Pro+ | Free pra todos | Blur + paywall converte |
| 13 | Fase 1 = só billing MVP | Tudo junto | Skeptic: scope muito grande pra solo dev |
| 14 | Validar demand SML com survey | Assumir que vão pagar | Skeptic: 2800 Discord ≠ paying users |
| 15 | Free = 2 contas (não 1) | 1 conta | User Advocate: 1 conta inútil pra prop trader |
| 16 | Elite AI: 5/dia max | Ilimitado real | Skeptic: custo pode exceder subscription |
| 17 | Badge "última atualização" no drawdown | Sem warning | User Advocate: segurança do capital |
| 18 | Import discrepancy report | Só mostrar total | User Advocate: confiança no parser |
| 19 | Página de sucesso pós-pagamento | Só redirect de volta | User Advocate: confirmação visual |
| 20 | Sem claims "real-time" até ser real | Marketing aspiracional | User Advocate: honestidade |
| 21 | Stripe webhook idempotency + signature | Custom validation | Constraint Guardian: segurança |
| 22 | RLS obrigatório pré-deploy | Adicionar depois | Constraint Guardian: billing data exposure |
| 23 | Sentry desde Fase 1 | Adicionar depois | Constraint Guardian: solo dev precisa observability |
| 24 | LGPD: 30d soft → hard delete (cron) | Só soft delete | Skeptic: compliance obrigatória |
| 25 | Pre-agregar trades pro AI Coach | Enviar raw | Constraint Guardian: custo + latência |
| 26 | 1 análise AI grátis no signup | Só paywall | User Advocate: demonstrar valor |
| 27 | Email parser > file watcher como prioridade | File watcher primeiro | Skeptic: Electron é scope enorme |

---

## 13. Multi-Agent Review

### Reviewers
1. **Skeptic/Challenger** — 14 objeções (12 aceitas, 2 rebatidas)
2. **Constraint Guardian** — 8 objeções (8 aceitas)
3. **User Advocate** — 12 objeções (11 aceitas, 1 rebatida)

### Arbiter Verdict
**APPROVED** — Design thorough, objections rigorously addressed, scope realistic for solo dev MVP, risks acknowledged with mitigation paths.

### Advisory Note (non-blocking)
Soft delete hard delete trigger: implementar como cron job (Supabase pg_cron ou Vercel cron).
