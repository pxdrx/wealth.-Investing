# i18n Toggle PT/EN Full Fix — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make PT default, EN functional on every page, toggle working on all routes, no mixed-language UI.

**Architecture:** Cookie-first locale resolution with next-intl. Middleware handles landing URL prefix. LocaleSwitcher branches landing-vs-app. Single dictionary in `messages/{pt,en}.json` under `app.*` namespace.

**Tech Stack:** Next.js 14 App Router, next-intl 3.x, TypeScript strict.

**Spec:** [docs/superpowers/specs/2026-04-22-i18n-toggle-fix-design.md](../specs/2026-04-22-i18n-toggle-fix-design.md)

---

## File Structure

**New:**
- `lib/i18n/landing-routes.ts` — shared helper (single source of truth).

**Modified:**
- `middleware.ts` — cookie-first redirect, disable Accept-Language sniff.
- `components/layout/LocaleSwitcher.tsx` — two-mode switch.
- `app/layout.tsx` — dynamic `<html lang>`.
- `app/app/layout.tsx` — add `onError` + `getMessageFallback`.
- `app/[locale]/layout.tsx` — add `onError` + `getMessageFallback`.
- `messages/pt.json` — add `app.*` namespace.
- `messages/en.json` — add `app.*` namespace.
- 23 consumers of `useAppT()` → `useTranslations()`.
- ~65 files with hardcoded PT/EN strings.

**Deleted:**
- `lib/i18n/app.ts`.
- `hooks/useAppLocale.ts`.

---

## Phase 1 — Critical Bug Fixes (Middleware + Switcher + html lang)

### Task 1.1: Create shared landing-routes helper

**Files:**
- Create: `lib/i18n/landing-routes.ts`

- [ ] **Step 1: Write file**

```ts
// Single source of truth for which routes the i18n middleware covers.
// Middleware and LocaleSwitcher MUST stay aligned — drift produces broken toggles.
export const LANDING_ROUTE_PATTERN =
  /^(\/|\/(en)(\/.*)?|\/manifesto|\/pricing|\/features(\/.*)?|\/blog(\/.*)?)$/;

export function isLandingRoute(pathname: string): boolean {
  return LANDING_ROUTE_PATTERN.test(pathname);
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/i18n/landing-routes.ts
git commit -m "feat(i18n): shared landing-route helper for middleware + switcher"
```

### Task 1.2: Rewrite middleware — cookie-first, no Accept-Language sniff

**Files:**
- Modify: `middleware.ts`

- [ ] **Step 1: Replace file contents**

```ts
import { NextRequest, NextResponse } from "next/server";
import createMiddleware from "next-intl/middleware";
import { routing, locales } from "./i18n";
import { isLandingRoute } from "./lib/i18n/landing-routes";

/**
 * i18n middleware (Track B).
 *
 * Scope: public landing only — the `/app/**` surface relies on cookie-based
 * locale resolution in `app/app/layout.tsx`.
 *
 * Behavior:
 *   - localeDetection=false: Accept-Language is ignored. PT is always default
 *     unless the user explicitly chose EN (cookie).
 *   - Cookie-based redirect: when cookie=en and the URL has no locale prefix,
 *     redirect to /en[pathname]. Keeps returning EN users anchored to /en.
 */
const intlMiddleware = createMiddleware({
  ...routing,
  localeDetection: false,
  localePrefix: "as-needed",
});

export default function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (!isLandingRoute(pathname)) {
    return NextResponse.next();
  }

  const cookieLocale = req.cookies.get("NEXT_LOCALE")?.value;
  const hasLocalePrefix = locales.some(
    (l) => pathname === `/${l}` || pathname.startsWith(`/${l}/`),
  );

  if (!hasLocalePrefix && cookieLocale === "en") {
    const url = req.nextUrl.clone();
    url.pathname = pathname === "/" ? "/en" : `/en${pathname}`;
    return NextResponse.redirect(url);
  }

  return intlMiddleware(req);
}

export const config = {
  matcher: [
    "/",
    "/(en)",
    "/(en)/:path*",
    "/manifesto",
    "/pricing",
    "/features",
    "/features/:path*",
    "/blog",
    "/blog/:path*",
  ],
};
```

- [ ] **Step 2: Verify build passes**

Run: `npm run build`
Expected: no TypeScript errors.

- [ ] **Step 3: Commit**

```bash
git add middleware.ts
git commit -m "fix(i18n): cookie-first middleware, disable Accept-Language sniff"
```

### Task 1.3: Rewrite LocaleSwitcher — two-mode

**Files:**
- Modify: `components/layout/LocaleSwitcher.tsx`

- [ ] **Step 1: Replace file contents**

```tsx
"use client";

import { usePathname } from "next/navigation";
import { useTransition } from "react";
import { cn } from "@/lib/utils";
import { locales, defaultLocale, type Locale } from "@/i18n";
import { isLandingRoute } from "@/lib/i18n/landing-routes";

interface LocaleSwitcherProps {
  className?: string;
  compact?: boolean;
}

const LOCALE_LABELS: Record<Locale, string> = { pt: "PT", en: "EN" };

function resolveCurrentLocale(pathname: string | null, cookie: string | undefined): Locale {
  if (pathname) {
    for (const loc of locales) {
      if (pathname === `/${loc}` || pathname.startsWith(`/${loc}/`)) return loc;
    }
  }
  // Fallback to cookie for /app/** where URL carries no locale.
  if (cookie && (locales as readonly string[]).includes(cookie)) return cookie as Locale;
  return defaultLocale;
}

function stripLocalePrefix(pathname: string): string {
  for (const loc of locales) {
    if (pathname === `/${loc}`) return "/";
    if (pathname.startsWith(`/${loc}/`)) return pathname.slice(loc.length + 1);
  }
  return pathname;
}

function readCookie(name: string): string | undefined {
  if (typeof document === "undefined") return undefined;
  return document.cookie
    .split("; ")
    .find((row) => row.startsWith(`${name}=`))
    ?.split("=")[1];
}

export function LocaleSwitcher({ className, compact = false }: LocaleSwitcherProps) {
  const pathname = usePathname() ?? "/";
  const [isPending, startTransition] = useTransition();
  const current = resolveCurrentLocale(pathname, readCookie("NEXT_LOCALE"));

  const handleSwitch = (next: Locale) => {
    if (next === current) return;

    // Always persist the cookie first — both modes need it.
    if (typeof document !== "undefined") {
      document.cookie = `NEXT_LOCALE=${next};path=/;max-age=31536000;samesite=lax`;
    }

    startTransition(() => {
      if (isLandingRoute(pathname)) {
        // URL-prefix mode: flip /en ↔ /.
        const canonical = stripLocalePrefix(pathname);
        const normalized = canonical.startsWith("/") ? canonical : `/${canonical}`;
        const target =
          next === defaultLocale
            ? normalized || "/"
            : normalized === "/"
            ? "/en"
            : `/en${normalized}`;
        const search = typeof window !== "undefined" ? window.location.search : "";
        const hash = typeof window !== "undefined" ? window.location.hash : "";
        if (typeof window !== "undefined") {
          window.location.assign(`${target}${search}${hash}`);
        }
      } else {
        // Cookie-only mode (/app/**, auth flows, etc.): reload same URL.
        // Server layout reads cookie and picks messages.
        if (typeof window !== "undefined") {
          window.location.reload();
        }
      }
    });
  };

  return (
    <div
      className={cn(
        "inline-flex items-center gap-0.5 rounded-full border border-border/60 bg-muted/30 p-0.5",
        compact ? "text-[10px]" : "text-xs",
        className,
      )}
      role="group"
      aria-label="Language"
    >
      {locales.map((loc) => {
        const isActive = loc === current;
        return (
          <button
            key={loc}
            type="button"
            aria-pressed={isActive}
            disabled={isPending}
            onClick={() => handleSwitch(loc)}
            className={cn(
              "rounded-full px-2.5 py-1 font-medium transition-colors",
              isActive
                ? "bg-accent text-accent-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
              isPending && "opacity-60",
            )}
            style={
              isActive
                ? { backgroundColor: "hsl(var(--accent))", color: "hsl(var(--accent-foreground))" }
                : undefined
            }
          >
            {LOCALE_LABELS[loc]}
          </button>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 2: Build**

Run: `npm run build`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add components/layout/LocaleSwitcher.tsx
git commit -m "fix(i18n): LocaleSwitcher two-mode — URL flip for landing, cookie+reload for /app/**"
```

### Task 1.4: Dynamic `<html lang>` in root layout

**Files:**
- Modify: `app/layout.tsx`

- [ ] **Step 1: Read current file**

Use Read tool before editing.

- [ ] **Step 2: Replace hardcoded `<html lang="pt-BR">`**

Add at top of file:
```ts
import { cookies } from "next/headers";
```

Change RootLayout body:
```tsx
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const cookieLocale = cookies().get("NEXT_LOCALE")?.value;
  const htmlLang = cookieLocale === "en" ? "en" : "pt-BR";
  return (
    <html lang={htmlLang} suppressHydrationWarning>
      {/* ...existing body unchanged */}
    </html>
  );
}
```

- [ ] **Step 3: Build**

Run: `npm run build`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add app/layout.tsx
git commit -m "fix(i18n): dynamic html lang from NEXT_LOCALE cookie"
```

### Task 1.5: Provider error handling (both layouts)

**Files:**
- Modify: `app/app/layout.tsx`
- Modify: `app/[locale]/layout.tsx`

- [ ] **Step 1: Extract provider config helper**

Create `lib/i18n/provider-config.ts`:
```ts
export const providerConfig = {
  onError: (err: { code?: string }) => {
    if (err.code === "MISSING_MESSAGE") {
      if (process.env.NODE_ENV !== "production") {
        // eslint-disable-next-line no-console
        console.warn("[i18n] missing key:", err);
      }
      return;
    }
    throw err;
  },
  getMessageFallback: ({ namespace, key }: { namespace?: string; key: string }) =>
    namespace ? `${namespace}.${key}` : key,
};
```

- [ ] **Step 2: Apply to `app/app/layout.tsx`**

```tsx
import { providerConfig } from "@/lib/i18n/provider-config";
// ...
<NextIntlClientProvider
  locale={locale}
  messages={messages}
  onError={providerConfig.onError}
  getMessageFallback={providerConfig.getMessageFallback}
>
```

- [ ] **Step 3: Apply to `app/[locale]/layout.tsx`** (same pattern).

- [ ] **Step 4: Build + commit**

```bash
npm run build
git add app/app/layout.tsx app/[locale]/layout.tsx lib/i18n/provider-config.ts
git commit -m "fix(i18n): provider fallback on missing keys"
```

### Task 1.6: Smoke test P1

- [ ] **Step 1: Start dev server**

Run: `npm run dev`

- [ ] **Step 2: Manual smoke matrix**

Open in incognito (clear cookies) each time:
| URL | Expected |
|-----|----------|
| `/` | PT landing |
| `/en` | EN landing |
| Click EN on `/` | navigates to `/en`, cookie=en |
| Click PT on `/en` | navigates to `/`, cookie=pt |
| Login → `/app/dashboard`, click EN | same URL reloads, strings partial-EN (more in P3/P4) |
| Reload `/app/dashboard` with cookie=en | no 404, renders |

If all pass → P1 complete. If any fail, fix and re-commit before P2.

---

## Phase 2 — Parity Script + CI Hook

Existing script already at `scripts/check-i18n-parity.mjs`. `i18n:check` exists in `package.json`. Needs wiring into `build`.

### Task 2.1: Gate build on i18n:check

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Change build script**

```json
"build": "npm run i18n:check && next build"
```

- [ ] **Step 2: Run it**

Run: `npm run build`
Expected: parity check passes (currently 0 missing), then next build runs.

- [ ] **Step 3: Commit**

```bash
git add package.json
git commit -m "chore(i18n): gate build on parity check"
```

---

## Phase 3 — Consolidate `app.*` namespace into messages

### Task 3.1: Draft `app.*` namespace JSON (PT)

**Files:**
- Modify: `messages/pt.json`

Currently `lib/i18n/app.ts` PT dict has English values for several keys. Fix every value to real PT during merge.

- [ ] **Step 1: Add `app` top-level namespace to `messages/pt.json`**

Insert before closing `}`:
```json
,
"app": {
  "common": {
    "save": "Salvar",
    "cancel": "Cancelar",
    "close": "Fechar",
    "confirm": "Confirmar",
    "delete": "Excluir",
    "edit": "Editar",
    "add": "Adicionar",
    "back": "Voltar",
    "next": "Avançar",
    "search": "Pesquisar",
    "loading": "Carregando…",
    "retry": "Tentar novamente",
    "submit": "Enviar",
    "yes": "Sim",
    "no": "Não",
    "optional": "Opcional",
    "required": "Obrigatório",
    "copy": "Copiar",
    "copied": "Copiado",
    "skipToContent": "Pular para o conteúdo",
    "error": "Erro",
    "success": "Sucesso",
    "warning": "Aviso"
  },
  "journal": {
    "title": "Journal",
    "subtitle": "Registro de operações e análise de performance.",
    "addTrade": "Adicionar trade",
    "showValues": "Mostrar valores",
    "hideValues": "Ocultar valores",
    "emptyTitle": "Sem trades ainda",
    "emptyDescription": "Importe seu histórico MT5 ou adicione trades manualmente."
  },
  "macro": {
    "title": "Inteligência Macro",
    "subtitle": "Terminal quantitativo, calendário econômico e narrativas macro geradas por IA.",
    "refresh": "Atualizar",
    "myAssets": "Só meus ativos",
    "breaking": {
      "title": "Breaking — Alto Impacto",
      "dismiss": "Dispensar",
      "dismissFailed": "Não foi possível dispensar a notícia. Tente novamente.",
      "loginRequired": "Faça login para dispensar notícias permanentemente.",
      "connectionError": "Erro de conexão ao dispensar notícia."
    },
    "sentiment": {
      "riskOn": "Risk On",
      "riskOff": "Risk Off"
    }
  },
  "prop": {
    "title": "Contas",
    "byFirm": "Por firma",
    "subtitle": "Painel de contas prop, pessoais e cripto."
  },
  "reports": {
    "title": "Relatórios",
    "exportPdf": "Exportar PDF"
  },
  "dexter": {
    "chat": "Chat",
    "coach": "Coach",
    "analyst": "Analyst",
    "unavailable": "Coach indisponível no momento. Tente novamente em alguns minutos.",
    "loading": "Pensando…",
    "placeholder": "Envie sua primeira mensagem ao Dexter."
  },
  "dayTimeline": {
    "subtitle": "Seus trades ao longo do dia (08:00–22:00 BRT). Tamanho da bolha = magnitude do PnL.",
    "profit": "Lucro",
    "loss": "Prejuízo",
    "session": "Sessão de mercado (Londres / NY)",
    "none": "Nenhum trade hoje ainda. Hora de observar antes de agir."
  },
  "sidebar": {
    "tier": {
      "free": "Gratuito",
      "pro": "Pro",
      "ultra": "Ultra",
      "mentor": "Mentor"
    },
    "operator": "Operador",
    "loading": "Carregando…",
    "dayOne": "dia",
    "dayMany": "dias",
    "record": "Recorde",
    "logout": "Sair",
    "hideValues": "Ocultar valores",
    "showValues": "Mostrar valores",
    "settings": "Configurações"
  },
  "appHeader": {
    "dashboard": "Painel",
    "account": "Conta",
    "notifications": "Notificações",
    "openMenu": "Abrir menu",
    "closeMenu": "Fechar menu"
  },
  "auth": {
    "signIn": "Entrar",
    "signUp": "Criar conta",
    "email": "E-mail",
    "password": "Senha",
    "forgotPassword": "Esqueci minha senha",
    "resetPassword": "Redefinir senha",
    "magicLink": "Link mágico",
    "continueWithGoogle": "Continuar com Google",
    "orContinueWith": "Ou continue com",
    "noAccount": "Não tem conta?",
    "haveAccount": "Já tem conta?"
  },
  "onboarding": {
    "welcome": "Bem-vindo",
    "displayNameLabel": "Como devemos te chamar?",
    "displayNamePlaceholder": "Seu nome",
    "continue": "Continuar"
  },
  "settings": {
    "title": "Configurações",
    "profile": "Perfil",
    "subscription": "Assinatura",
    "preferences": "Preferências",
    "language": "Idioma",
    "theme": "Tema",
    "signOut": "Sair"
  },
  "errors": {
    "notFound": "Página não encontrada",
    "notFoundDescription": "O endereço não existe ou foi movido.",
    "serverError": "Algo deu errado",
    "tryAgain": "Tentar novamente",
    "goHome": "Voltar para início"
  }
}
```

- [ ] **Step 2: Run parity check (expected to fail — EN missing these keys)**

Run: `npm run i18n:check`
Expected: FAIL, list of missing EN keys.

- [ ] **Step 3: Commit (parity temporarily broken, will be fixed next task)**

```bash
git add messages/pt.json
git commit -m "feat(i18n): add app.* PT namespace draft (EN parity fix in next commit)"
```

### Task 3.2: EN translations for `app.*`

**Files:**
- Modify: `messages/en.json`

- [ ] **Step 1: Mirror `app.*` namespace in EN**

```json
,
"app": {
  "common": {
    "save": "Save",
    "cancel": "Cancel",
    "close": "Close",
    "confirm": "Confirm",
    "delete": "Delete",
    "edit": "Edit",
    "add": "Add",
    "back": "Back",
    "next": "Next",
    "search": "Search",
    "loading": "Loading…",
    "retry": "Retry",
    "submit": "Submit",
    "yes": "Yes",
    "no": "No",
    "optional": "Optional",
    "required": "Required",
    "copy": "Copy",
    "copied": "Copied",
    "skipToContent": "Skip to content",
    "error": "Error",
    "success": "Success",
    "warning": "Warning"
  },
  "journal": {
    "title": "Journal",
    "subtitle": "Trade log and performance analysis.",
    "addTrade": "Add trade",
    "showValues": "Show values",
    "hideValues": "Hide values",
    "emptyTitle": "No trades yet",
    "emptyDescription": "Import your MT5 history or add trades manually."
  },
  "macro": {
    "title": "Macro Intelligence",
    "subtitle": "Quantitative terminal, economic calendar, and AI-generated macro narratives.",
    "refresh": "Refresh",
    "myAssets": "My assets only",
    "breaking": {
      "title": "Breaking — High Impact",
      "dismiss": "Dismiss",
      "dismissFailed": "Could not dismiss headline. Try again.",
      "loginRequired": "Sign in to dismiss headlines permanently.",
      "connectionError": "Connection error while dismissing headline."
    },
    "sentiment": {
      "riskOn": "Risk On",
      "riskOff": "Risk Off"
    }
  },
  "prop": {
    "title": "Accounts",
    "byFirm": "By firm",
    "subtitle": "Prop, personal, and crypto accounts dashboard."
  },
  "reports": {
    "title": "Reports",
    "exportPdf": "Export PDF"
  },
  "dexter": {
    "chat": "Chat",
    "coach": "Coach",
    "analyst": "Analyst",
    "unavailable": "Coach unavailable right now. Please try again in a few minutes.",
    "loading": "Thinking…",
    "placeholder": "Send Dexter your first message."
  },
  "dayTimeline": {
    "subtitle": "Your trades across the day (08:00–22:00 BRT). Bubble size = PnL magnitude.",
    "profit": "Profit",
    "loss": "Loss",
    "session": "Market session (London / NY)",
    "none": "No trades today yet. Time to observe before acting."
  },
  "sidebar": {
    "tier": {
      "free": "Free",
      "pro": "Pro",
      "ultra": "Ultra",
      "mentor": "Mentor"
    },
    "operator": "Operator",
    "loading": "Loading…",
    "dayOne": "day",
    "dayMany": "days",
    "record": "Record",
    "logout": "Sign out",
    "hideValues": "Hide values",
    "showValues": "Show values",
    "settings": "Settings"
  },
  "appHeader": {
    "dashboard": "Dashboard",
    "account": "Account",
    "notifications": "Notifications",
    "openMenu": "Open menu",
    "closeMenu": "Close menu"
  },
  "auth": {
    "signIn": "Sign in",
    "signUp": "Create account",
    "email": "Email",
    "password": "Password",
    "forgotPassword": "Forgot password",
    "resetPassword": "Reset password",
    "magicLink": "Magic link",
    "continueWithGoogle": "Continue with Google",
    "orContinueWith": "Or continue with",
    "noAccount": "Don't have an account?",
    "haveAccount": "Already have an account?"
  },
  "onboarding": {
    "welcome": "Welcome",
    "displayNameLabel": "What should we call you?",
    "displayNamePlaceholder": "Your name",
    "continue": "Continue"
  },
  "settings": {
    "title": "Settings",
    "profile": "Profile",
    "subscription": "Subscription",
    "preferences": "Preferences",
    "language": "Language",
    "theme": "Theme",
    "signOut": "Sign out"
  },
  "errors": {
    "notFound": "Page not found",
    "notFoundDescription": "This address doesn't exist or has been moved.",
    "serverError": "Something went wrong",
    "tryAgain": "Try again",
    "goHome": "Back to home"
  }
}
```

- [ ] **Step 2: Parity check**

Run: `npm run i18n:check`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add messages/en.json
git commit -m "feat(i18n): add app.* EN namespace, parity restored"
```

---

## Phase 4 — Migrate `useAppT` Consumers to `useTranslations`

Pattern change, applied 23 times. Consumers (from grep):

```
components/dashboard/BacktestSection.tsx
components/dashboard/DayTimeline.tsx
components/dashboard/SmartAlertsBanner.tsx
components/dashboard/TodayMatters.tsx
components/journal/AdaptiveImportModal.tsx
components/journal/AddTradeModal.tsx
components/journal/DayDetailModal.tsx
components/journal/ImportPreview.tsx
components/journal/JournalEmptyOnboarding.tsx
components/journal/JournalTradesTable.tsx
components/journal/NoteRow.tsx
components/journal/PsychologySection.tsx
components/journal/TagPicker.tsx
components/journal/TradeDetailModal.tsx
components/journal/TradeScreenshotUpload.tsx
components/layout/AppHeader.tsx
components/layout/AppSidebar.tsx
components/macro/BreakingNewsFeed.tsx
components/macro/EconomicCalendar.tsx
components/macro/HeadlinesFeed.tsx
components/macro/SentimentBar.tsx
app/app/journal/page.tsx
app/app/macro/page.tsx
```

### Task 4.1: Migration pattern

Replace:
```ts
import { useAppT } from "@/hooks/useAppLocale";
const t = useAppT();
// t("journal.title")
```

With:
```ts
import { useTranslations } from "next-intl";
const t = useTranslations("app.journal");
// t("title")
```

Key mapping — dot-to-dash keys from `lib/i18n/app.ts` become nested:
- `"journal.add-trade"` → `t("addTrade")` (under `useTranslations("app.journal")`)
- `"journal.show-values"` → `t("showValues")`
- `"sidebar.tier.free"` → `t("tier.free")` (under `useTranslations("app.sidebar")`)
- `"macro.breaking.title"` → `t("breaking.title")` (under `useTranslations("app.macro")`)

If a single component pulls keys from multiple namespaces, use multiple `useTranslations` calls or hoist to `useTranslations("app")` + `t("namespace.key")`.

### Task 4.2: Per-file migration (one commit per 3-5 files)

For each file:
- [ ] Read file to identify keys used.
- [ ] Pick namespace(s): if all keys under one prefix (e.g., `journal.*`), use `useTranslations("app.journal")`. If mixed, use `useTranslations("app")`.
- [ ] Replace import + hook call.
- [ ] Replace every `t("full.key")` with appropriate shortened key.
- [ ] Convert any kebab-case keys (`show-values`) to camelCase (`showValues`) — match JSON.
- [ ] Build check: `npm run build` — must pass.

Batch suggestion (5 commits):
1. `components/layout/AppHeader.tsx` + `components/layout/AppSidebar.tsx` (high-visibility chrome).
2. `components/dashboard/*` (4 files).
3. `components/journal/*` (11 files).
4. `components/macro/*` (4 files).
5. `app/app/journal/page.tsx` + `app/app/macro/page.tsx` + any leftover.

Commit template:
```bash
git commit -m "refactor(i18n): migrate <area> components to useTranslations"
```

### Task 4.3: Run full build after all migrations

- [ ] Run: `npm run build`
- [ ] Expected: PASS. No `useAppT` imports remaining in production code.
- [ ] Verify: `grep -rn "useAppT\|useAppLocale" app/ components/ hooks/ lib/` returns nothing.

---

## Phase 5 — Delete Dead Code

### Task 5.1: Remove legacy dictionary

**Files:**
- Delete: `lib/i18n/app.ts`
- Delete: `hooks/useAppLocale.ts`

- [ ] **Step 1: Confirm zero imports**

Run grep: must return zero hits in `app/`, `components/`, `hooks/`, `lib/`.

- [ ] **Step 2: Delete files**

```bash
rm lib/i18n/app.ts hooks/useAppLocale.ts
```

- [ ] **Step 3: Build**

Run: `npm run build`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "refactor(i18n): remove legacy useAppT dictionary (migrated to next-intl)"
```

---

## Phase 6 — Hardcoded Sweep: `app/app/**` pages

Target files (from grep — contain PT-only strings):
- `app/app/account/page.tsx`
- `app/app/admin/macro-audit/page.tsx` (admin — PT only, skip per scope)
- `app/app/chart/page.tsx`
- `app/app/dexter/analyst/page.tsx`
- `app/app/error.tsx`
- `app/app/journal/page.tsx`
- `app/app/macro/page.tsx`
- `app/app/mentor/page.tsx`
- `app/app/prop/page.tsx`
- `app/app/settings/page.tsx`
- `app/app/subscription/success/page.tsx`

Plus: `app/app/page.tsx`, `app/app/backtest/page.tsx`, `app/app/news/page.tsx`, `app/app/reports/page.tsx`, `app/app/dexter/page.tsx`, `app/app/pricing/page.tsx` (check via grep per file).

### Task 6.1: Per-file sweep recipe

For each file:
- [ ] Read file.
- [ ] List every visible string literal (JSX text, button labels, placeholders, aria-labels, titles, alts, toast messages).
- [ ] Add missing keys to `messages/pt.json` + `messages/en.json` under `app.<namespace>.*`.
- [ ] If it's a Client Component: `"use client"` + `import { useTranslations } from "next-intl"` + `const t = useTranslations("app.<namespace>")`.
- [ ] If it's a Server Component: `import { getTranslations } from "next-intl/server"` + `const t = await getTranslations("app.<namespace>")`.
- [ ] Replace each literal with `t("key")`.
- [ ] Run `npm run i18n:check` — must pass.
- [ ] Run `npm run build` — must pass.
- [ ] Commit: one per file or logical group.

Concrete example — `app/app/settings/page.tsx`:
```tsx
// Before
<h1>Configurações</h1>
<Button>Salvar</Button>

// After
import { useTranslations } from "next-intl";
const t = useTranslations("app.settings");
const tc = useTranslations("app.common");
<h1>{t("title")}</h1>
<Button>{tc("save")}</Button>
```

### Task 6.2: Skip-link in `app/app/layout.tsx`

- [ ] Replace `Pular para o conteúdo` with `t("common.skipToContent")`.
- [ ] Requires converting layout to use `getTranslations("app.common")`.

Snippet:
```tsx
import { getTranslations } from "next-intl/server";
// inside AppLayout (make it async):
const tCommon = await getTranslations("app.common");
// ...
<a href="#main-content" className="sr-only focus:not-sr-only …">
  {tCommon("skipToContent")}
</a>
```

Commit: `fix(i18n): translate app layout skip link`

---

## Phase 7 — Hardcoded Sweep: `app/app/**` Components

Scope: `components/dashboard/*`, `components/journal/*`, `components/macro/*`, `components/layout/*`, `components/ai/*`, `components/dexter/*`, `components/billing/*`, `components/prop/*`, `components/settings/*`, `components/onboarding/*`.

Method same as Task 6.1. Prefer stable namespaces already defined in `app.*`.

### Task 7.1: Sweep

- [ ] For each file with PT/EN literals, apply Task 6.1 recipe.
- [ ] Group by component subdirectory, one commit per subdirectory.
- [ ] After each subdirectory: `npm run i18n:check && npm run build`.

Commit format: `feat(i18n): translate <subdirectory> components`

---

## Phase 8 — Hardcoded Sweep: Auth Flow

Files:
- `app/login/page.tsx`
- `app/onboarding/page.tsx`
- `app/reset-password/page.tsx`
- `app/auth/callback/page.tsx` (if has user-visible strings)

### Task 8.1: Provide i18n provider for auth routes

Auth routes sit outside `app/[locale]/**` AND outside `app/app/**`. Current state: no next-intl provider mounted. Must add one, cookie-driven, same pattern as `app/app/layout.tsx`.

- [ ] **Step 1: Create `app/(auth)/layout.tsx`** OR convert each auth page to mount its own provider.

Simpler: wrap login/onboarding/reset-password in shared `lib/i18n/AuthLocaleProvider.tsx` (Client Component) that reads cookie + mounts `NextIntlClientProvider`.

Actually cleanest: co-locate server-side cookie read in each page (they're already server components).

Pattern for each auth page:
```tsx
import { NextIntlClientProvider } from "next-intl";
import { cookies } from "next/headers";
import { locales, defaultLocale, type Locale } from "@/i18n";
import { providerConfig } from "@/lib/i18n/provider-config";
import ptMessages from "@/messages/pt.json";
import enMessages from "@/messages/en.json";

const MESSAGES = { pt: ptMessages, en: enMessages as typeof ptMessages };

function resolveLocale(): Locale {
  const v = cookies().get("NEXT_LOCALE")?.value;
  return (locales as readonly string[]).includes(v ?? "") ? (v as Locale) : defaultLocale;
}

export default function LoginPage() {
  const locale = resolveLocale();
  const messages = MESSAGES[locale];
  return (
    <NextIntlClientProvider
      locale={locale}
      messages={messages}
      onError={providerConfig.onError}
      getMessageFallback={providerConfig.getMessageFallback}
    >
      <LoginPageClient />
    </NextIntlClientProvider>
  );
}
```

BETTER: create a shared `lib/i18n/withPageLocaleProvider.tsx` server helper:
```tsx
import { NextIntlClientProvider } from "next-intl";
import { cookies } from "next/headers";
import { locales, defaultLocale, type Locale } from "@/i18n";
import { providerConfig } from "@/lib/i18n/provider-config";
import ptMessages from "@/messages/pt.json";
import enMessages from "@/messages/en.json";

const MESSAGES: Record<Locale, typeof ptMessages> = {
  pt: ptMessages,
  en: enMessages as typeof ptMessages,
};

export function resolvePageLocale(): Locale {
  const v = cookies().get("NEXT_LOCALE")?.value;
  return (locales as readonly string[]).includes(v ?? "") ? (v as Locale) : defaultLocale;
}

export function PageLocaleProvider({ children }: { children: React.ReactNode }) {
  const locale = resolvePageLocale();
  return (
    <NextIntlClientProvider
      locale={locale}
      messages={MESSAGES[locale]}
      onError={providerConfig.onError}
      getMessageFallback={providerConfig.getMessageFallback}
    >
      {children}
    </NextIntlClientProvider>
  );
}
```

Use in each auth page:
```tsx
import { PageLocaleProvider } from "@/lib/i18n/withPageLocaleProvider";
export default function LoginPage() {
  return <PageLocaleProvider><LoginPageClient /></PageLocaleProvider>;
}
```

Commit: `feat(i18n): PageLocaleProvider helper for auth + aux routes`

### Task 8.2: Translate auth pages

Per page:
- [ ] Extract all strings to `app.auth` + `app.onboarding` namespaces.
- [ ] Replace with `useTranslations`.
- [ ] Parity check + build.
- [ ] Commit.

---

## Phase 9 — Hardcoded Sweep: Aux Routes

Files:
- `app/academy/**/*.tsx`
- `app/brand/**/*.tsx`
- `app/changelog/**/*.tsx`
- `app/risk-disclaimer/page.tsx`
- `app/not-found.tsx`
- `app/error.tsx`

### Task 9.1: Wrap each with PageLocaleProvider + translate

- [ ] For each page: add `PageLocaleProvider` wrap.
- [ ] Extract strings to appropriate namespace: `app.academy`, `app.brand`, `app.changelog`, `app.riskDisclaimer`, `app.errors`.
- [ ] Add PT+EN to `messages/*.json`.
- [ ] Parity + build.
- [ ] Commit per route.

---

## Phase 10 — Hardcoded Sweep: Landing Components + Subpages

Most landing text is already in `messages/{pt,en}.json` namespaces (`hero`, `bento`, etc). Gaps:
- `components/landing/Navbar.tsx` — user menu: "Configurações", "Sair", "Dashboard", "Conta" (hardcoded PT).
- `components/landing/Footer.tsx` — verify.
- `components/landing/ExitIntentModal.tsx` — verify.
- `components/landing/StickyMobileCta.tsx` — verify.
- `components/landing/PricingSummary.tsx` — verify.
- `components/landing/NavModals.tsx` — verify.

### Task 10.1: Navbar user menu

- [ ] In `components/landing/Navbar.tsx`, add `useTranslations("nav")` for "Dashboard", `useTranslations("app.sidebar")` for "settings"/"logout", or create `nav.userMenu.*` keys.
- [ ] Replace literals.
- [ ] Build + commit.

### Task 10.2: Remaining landing components

- [ ] Per-file grep for PT/EN residue.
- [ ] Add missing namespace keys.
- [ ] Translate.
- [ ] Commit per file.

---

## Phase 11 — Playwright Tests

### Task 11.1: Add bilingual test suite

**Files:**
- Create: `tests/e2e/i18n.spec.ts`

- [ ] **Step 1: Write tests**

```ts
import { test, expect } from "@playwright/test";

test.describe("i18n toggle", () => {
  test("cold PT-browser visitor sees PT on /", async ({ browser }) => {
    const ctx = await browser.newContext({ locale: "pt-BR" });
    const page = await ctx.newPage();
    await page.goto("/");
    await expect(page.locator("html")).toHaveAttribute("lang", "pt-BR");
    // Assert a known PT hero string from messages/pt.json → hero.title
    await expect(page.getByText(/trading/i)).toBeVisible();
    await ctx.close();
  });

  test("cold EN-browser visitor still sees PT on / (regression — Bug 1)", async ({ browser }) => {
    const ctx = await browser.newContext({ locale: "en-US" });
    const page = await ctx.newPage();
    await page.goto("/");
    await expect(page).toHaveURL(/\/$/); // no redirect to /en
    await expect(page.locator("html")).toHaveAttribute("lang", "pt-BR");
    await ctx.close();
  });

  test("click EN on landing flips URL to /en", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "EN" }).click();
    await expect(page).toHaveURL(/\/en$/);
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
  });

  test("cookie=en on / redirects to /en", async ({ browser }) => {
    const ctx = await browser.newContext();
    await ctx.addCookies([{ name: "NEXT_LOCALE", value: "en", url: "http://localhost:3000" }]);
    const page = await ctx.newPage();
    await page.goto("/");
    await expect(page).toHaveURL(/\/en$/);
    await ctx.close();
  });

  // Auth'd flow requires test login helper. Skip if not available.
  test.skip("click EN on /app/journal reloads same URL in EN", async ({ page }) => {
    // TODO once test auth helper exists
  });
});
```

- [ ] **Step 2: Run**

Run: `npx playwright test tests/e2e/i18n.spec.ts`
Expected: PASS (PT/EN tests). Skip the auth'd one.

- [ ] **Step 3: Commit**

```bash
git add tests/e2e/i18n.spec.ts
git commit -m "test(i18n): bilingual toggle regression suite"
```

---

## Phase 12 — Visual QA + Deploy Monitoring

### Task 12.1: Manual visual sweep

- [ ] `npm run dev`, open every authenticated page (list from `app/app/**` tree) in PT, then clear cookie + set EN, reload each.
- [ ] Document any residual PT-in-EN or EN-in-PT in a follow-up issue.

### Task 12.2: Deploy + Sentry watch

- [ ] `git push origin main` — Vercel auto-deploys.
- [ ] 48h: check Sentry for `MISSING_MESSAGE` errors. Zero = acceptance criterion met.
- [ ] If any appear, patch keys + redeploy.

Commit: `chore(i18n): complete PT/EN bilingual sweep`

---

## Self-Review (run before execution)

**Spec coverage:**
- Bug 1 (Accept-Language sniff) → Task 1.2 ✓
- Bug 2 (toggle crash on /app/**) → Task 1.3 ✓
- Bug 3 (PT has EN, EN has PT, hardcoded) → P3, P4, P5, P6, P7, P8, P9, P10 ✓
- Bug 4 (EN broken) → entire plan ✓
- Parity guard → Task 2.1 ✓
- html lang dynamic → Task 1.4 ✓
- Provider fallback → Task 1.5 ✓
- Scope max → P6-P10 cover every page ✓

**No placeholders.** Every code block is concrete.

**Type consistency.** `resolveLocale`, `providerConfig`, `PageLocaleProvider`, `isLandingRoute` — names repeated consistently. `useTranslations("app.journal")("title")` pattern used identically in P4 + P6.

---

## Execution

Plan complete. User chose continuous execution (auto mode, "finalize tudo, sem pausas"). Proceeding with inline executing-plans approach.
