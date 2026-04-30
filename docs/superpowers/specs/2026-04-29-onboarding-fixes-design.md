# Onboarding Fixes Design (2026-04-29)

## Problemas

1. **Tour pula etapas:** OnboardingTour só tem 5 steps de feature (dashboard, journal, mentor, macro, dexter) mas sidebar tem 8 itens. Faltam: Contas (`prop`), Gráfico (`chart`), Backtest (`backtest`).
2. **Mentor step não foca:** sidebar auto-collapse <1024px + nav scrollable causa target fora do viewport. Tour não faz `scrollIntoView` antes de `getBoundingClientRect`.
3. **Tooltips fora da tela:** `getTooltipStyle` não clampa ao viewport. Card sem `maxHeight`. Em planos free/pro com sidebar collapsed, tooltip vaza pela direita.
4. **Tier upgrades sem onboard ou incompletos:**
   - Pro→Ultra mostra recap completo (4 steps Pro repetidos + 2 Ultra). Sem delta.
   - Ultra→Mentor zero onboarding — `ProOnboardingGuard` ignora `plan === "mentor"`.
   - `MentorOnboardingModal` não está montado no AppShell.
5. **Tour reaparece em re-login:** state em localStorage não confiável (browsers diferentes, privacy mode, mid-tour close deixa `TOUR_PENDING_KEY=1`, exception silenciosa). Sem persistência server-side por user_id.

## Decisões

- **Delta model:** cada upgrade mostra apenas features novas do tier alcançado.
- **Backfill:** users existentes recebem `tour_completed_at = now()` e `max_tier_seen = current plan`. Onboarding novo só dispara para users criados após deploy.
- **Source of truth:** server-side (`user_onboarding` table). localStorage vira cache.

## Arquitetura

### Schema (Supabase)

```sql
create table public.user_onboarding (
  user_id uuid primary key references auth.users(id) on delete cascade,
  tour_completed_at timestamptz,
  max_tier_seen text not null default 'free' check (max_tier_seen in ('free','pro','ultra','mentor')),
  updated_at timestamptz not null default now()
);

alter table public.user_onboarding enable row level security;

create policy "user_onboarding_select_own" on public.user_onboarding
  for select using (auth.uid() = user_id);
create policy "user_onboarding_insert_own" on public.user_onboarding
  for insert with check (auth.uid() = user_id);
create policy "user_onboarding_update_own" on public.user_onboarding
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Backfill: existentes não veem tour novo nem delta modais
insert into public.user_onboarding (user_id, tour_completed_at, max_tier_seen)
select
  u.id,
  now(),
  coalesce(s.tier, 'free')
from auth.users u
left join public.subscriptions s on s.user_id = u.id and s.status in ('active','trialing')
on conflict (user_id) do nothing;
```

### API routes

`GET /api/onboarding/state`
- Auth: Bearer token
- Resposta: `{ ok: true, state: { tourCompletedAt: string|null, maxTierSeen: 'free'|'pro'|'ultra'|'mentor' } }`
- Auto-cria row com defaults se não existir (apenas `INSERT ... ON CONFLICT DO NOTHING`)

`POST /api/onboarding/state`
- Auth: Bearer token
- Body: `{ tourCompletedAt?: string, maxTierSeen?: TierName }`
- Upserta. Apenas avança maxTierSeen (nunca regredir).
- Resposta: `{ ok: true, state: ... }`

### Hook

`useOnboardingState()` em `lib/onboarding/use-onboarding-state.ts`:

```ts
type TierName = 'free' | 'pro' | 'ultra' | 'mentor';
type State = { tourCompletedAt: string | null; maxTierSeen: TierName };

function useOnboardingState(): {
  state: State | null;
  isLoading: boolean;
  markTourCompleted: () => Promise<void>;
  markTierSeen: (tier: TierName) => Promise<void>;
};
```

Cache localStorage chave `wealth_onboarding_state_v1` (hidrata UI rápida, server reconcilia).

### Frontend componentes

**Renomeia/refatora:**
- `ProOnboardingModal` → `TierOnboardingModal` aceita `tier: 'pro'|'ultra'|'mentor'` e renderiza só steps do delta.
- `ProOnboardingGuard` → `TierOnboardingGuard`:
  - Lê `useOnboardingState()` + `useEntitlements()`
  - Tier rank: free=0, pro=1, ultra=2, mentor=3
  - Se `currentRank > seenRank` → enfileira modais para cada tier pulado em ordem
  - Após cada modal close → `markTierSeen(tier)` server-side, abre próximo

**Tour:**
- Adiciona 3 steps: prop, chart, backtest (após mentor, antes macro)
- `measureTarget`: `el.scrollIntoView({ block: 'center', behavior: 'smooth' })` + `requestAnimationFrame` × 2 antes do `getBoundingClientRect`
- `getTooltipStyle` clampa: `left = clamp(16, calc, vw - 320 - 16)`, idem top
- `TourCard` adiciona `maxHeight: 80vh; overflowY: auto`
- mobile: confirma `data-tour-id="mobile-{prop|chart|backtest}"` em `AppMobileNav` — se itens não no bottom bar, fallback para abrir drawer ou skip step no mobile

**AppShell:**
- Substitui leitura localStorage por `useOnboardingState()`
- Remove `ProOnboardingGuard` import → usa `TierOnboardingGuard`
- Remove version-bump cleanup (substituído por server state)
- handleTourComplete chama `markTourCompleted()` + cache local

### Delta content

**pro delta (4 steps):**
1. Dashboard completo + widgets reordenáveis
2. Relatórios e analytics (MFE/MAE, Sharpe, Sortino)
3. AI Coach com seus dados
4. Psicologia e disciplina (Termômetro Emocional)

**ultra delta (3 steps):**
1. Analista Dexter (5 dimensões)
2. Comparação entre contas + alertas customizados
3. Briefing macroeconômico on-demand

**mentor delta (3 steps):**
1. Painel Mentor — visão consolidada
2. Gestão de alunos + drawdown agregado
3. Ferramentas de comunicação e relatórios

## Fluxos

### Novo user (free, criado pós-deploy)
1. AppShell monta → `useOnboardingState()` retorna `{ tourCompletedAt: null, maxTierSeen: 'free' }`
2. AppShell vê tourCompletedAt null → `setShowTour(true)` (com delay 600ms)
3. User completa tour → `markTourCompleted()` POST server + cache
4. TierOnboardingGuard: rank current=0 vs seen=0 → não dispara

### Free → Pro upgrade
1. Stripe webhook atualiza subscriptions
2. SubscriptionContext detecta plan=pro
3. TierOnboardingGuard: rank current=1 > seen=0 → fila = [pro]
4. Mostra TierOnboardingModal(tier='pro') com 4 steps delta
5. Close → `markTierSeen('pro')`

### Free → Ultra direto
1. Fila = [pro, ultra]
2. Mostra modal pro → close → markTierSeen(pro) → mostra modal ultra → close → markTierSeen(ultra)

### Re-login mesmo browser ou outro
- `useOnboardingState` busca server → `tourCompletedAt` setado → tour não dispara
- maxTierSeen reflete último tier visto → guard não dispara

### Backfill users existentes
- Migration seta `tour_completed_at = now()` e `max_tier_seen` baseado em subscription atual → ninguém vê re-onboarding

## Não-objetivos

- Re-trigger via version bump (substituído por server state). Se quiser forçar re-tour para todos no futuro: zerar `tour_completed_at` via SQL.
- Internacionalização dos modais (mantém PT-BR atual).
- Animações novas — reusa Framer Motion existente.

## Files tocados

```
supabase/migrations/<timestamp>_user_onboarding.sql              [novo]
app/api/onboarding/state/route.ts                                [novo]
lib/onboarding/use-onboarding-state.ts                           [novo]
components/onboarding/TierOnboardingGuard.tsx                    [novo]
components/billing/ProOnboardingModal.tsx                        [refactor → TierOnboardingModal]
components/onboarding/OnboardingTour.tsx                         [edit: 3 steps, scrollIntoView, clamp, maxHeight]
components/layout/AppShell.tsx                                   [edit: usa hook server-side, troca guard]
components/onboarding/ProOnboardingGuard.tsx                     [delete]
lib/onboarding/version.ts                                        [delete ou mantém only deprecated]
components/layout/AppMobileNav.tsx                               [verificar/add data-tour-id]
```
