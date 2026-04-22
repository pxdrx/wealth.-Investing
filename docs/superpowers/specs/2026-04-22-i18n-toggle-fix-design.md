# i18n Toggle PT/EN — Full Fix Design

**Date:** 2026-04-22
**Status:** Approved (user: "pode seguir")
**Scope:** Maximum — landing + every authenticated page bilingual.

---

## Problem Statement

Three observable failures:

1. **Shared landing link sometimes opens in English.** PT must be default. EN only when user clicks toggle.
2. **Toggle crashes on `/app/**` pages.** Clicking EN on dashboard/journal/etc. produces error. Reload reverts to PT.
3. **Mixed-language UI in both modes.** PT pages show English strings. EN pages show Portuguese strings. Many strings never translated.

User goal: "página em português e em inglês — separem: português, português, inglês, inglês. Página em inglês precisa ser funcional."

---

## Root Cause Analysis

### RC1 — Accept-Language sniffing (Bug 1)
`middleware.ts` calls `createMiddleware(routing)` with defaults. Next-intl defaults `localeDetection: true` — sniffs `Accept-Language` header. Visitor with `en-US` browser hits `/` → middleware redirects to `/en`. Link itself is correct; visitor's browser locale triggers auto-redirect.

### RC2 — LocaleSwitcher URL logic (Bug 2)
[components/layout/LocaleSwitcher.tsx:54-72](components/layout/LocaleSwitcher.tsx#L54-L72) builds target URL for any path:
```
/app/journal  →  /en/app/journal
```
But `app/[locale]/**` only contains landing children (`blog`, `features`, `manifesto`, `pricing`, `page.tsx`, `opengraph-image.tsx`). `/en/app/journal` does not exist → 404/crash. Cookie is set correctly, but the navigation lands on broken URL. On manual reload of `/app/journal` the server resolver reads the cookie and would render EN — but user never gets there.

### RC3 — Dual i18n systems (Bug 3 part 1)
Two parallel dictionaries:
- **Track B (next-intl):** `messages/pt.json` + `messages/en.json` — mounted on landing via `app/[locale]/layout.tsx`.
- **Track C (custom):** `lib/i18n/app.ts` hardcoded dict — used by `hooks/useAppLocale.ts` (`useAppT`) under `/app/**`.

`lib/i18n/app.ts` PT dict contains English strings (copy-paste bug):
```ts
"journal.title": "Journal",          // should be PT
"dexter.chat": "Chat",               // should be PT
"prop.title": "Contas",              // this one is PT (mixed)
```
Result: PT page shows English for journal/dexter. EN page shows same strings (coincidentally correct for many keys).

### RC4 — Hardcoded strings (Bug 3 part 2)
Many components embed raw PT literals with no translation call. Examples:
- `app/app/layout.tsx:52` — `"Pular para o conteúdo"`
- `components/landing/Navbar.tsx` — `"Configurações"`, `"Sair"`, `"Dashboard"`, `"Conta"`
- Dashboard empty states, modal titles, tooltips, aria-labels, button labels across `app/app/**`.
EN user sees these as Portuguese regardless of toggle state.

### RC5 — Key parity drift (Bug 3 part 3)
`messages/pt.json` and `messages/en.json` top-level namespaces identical (21 each) but internal key ordering differs and recent hotfix commits (`2e8eba19`, `f4b69eff`) show ongoing drift. No automated parity guard.

---

## Architecture

### Decision: Unify under next-intl, cookie-driven for non-landing routes

Reasons:
- Eliminates the class of bug that produced RC3 (dual dicts).
- Provider already mounted in `app/app/layout.tsx` — no runtime migration risk.
- Next-intl has mature fallback + error handling (`getMessageFallback`).
- Landing keeps URL prefix (`/en/...`) for SEO (hreflang already configured).
- `/app/**` keeps cookie-only switch (can't use URL prefix: auth deep links, bookmark stability).

### Component Map

| Unit | File | Responsibility |
|------|------|----------------|
| Routing config | `i18n.ts` | Declare locales, request config. No change. |
| Middleware | `middleware.ts` | Cookie-first redirect for landing. No Accept-Language sniff. |
| Locale switcher | `components/layout/LocaleSwitcher.tsx` | Two-mode navigation (URL flip vs cookie+reload). |
| Public layout | `app/[locale]/layout.tsx` | next-intl provider for landing. No change. |
| App layout | `app/app/layout.tsx` | next-intl provider for authenticated. Already reads cookie correctly. No change. |
| Root layout | `app/layout.tsx` | `<html lang>` dynamic from cookie. |
| Messages | `messages/pt.json`, `messages/en.json` | Single source of truth. Namespaced. |
| Parity script | `scripts/i18n-check.mjs` | Fail build if keys diverge. |
| Dead code | `lib/i18n/app.ts`, `hooks/useAppLocale.ts` | Delete after consumer migration. |

---

## Detailed Design

### Unit 0 — Shared landing-path helper

New file `lib/i18n/landing-routes.ts`:
```ts
// Single source of truth for which routes the i18n middleware covers.
// Middleware and LocaleSwitcher MUST stay aligned — drift produces broken toggles.
export const LANDING_ROUTE_PATTERN = /^(\/|\/(en)(\/.*)?|\/manifesto|\/pricing|\/features(\/.*)?|\/blog(\/.*)?)$/;

export function isLandingRoute(pathname: string): boolean {
  return LANDING_ROUTE_PATTERN.test(pathname);
}
```

Both middleware and LocaleSwitcher import `isLandingRoute` + `LANDING_ROUTE_PATTERN` from this file.

### Unit 1 — Middleware (cookie-first)

```ts
// middleware.ts
import { NextRequest, NextResponse } from "next/server";
import createMiddleware from "next-intl/middleware";
import { routing, locales } from "./i18n";

const intlMiddleware = createMiddleware({
  ...routing,
  localeDetection: false, // disable Accept-Language sniff
  localePrefix: "as-needed",
});

import { isLandingRoute } from "./lib/i18n/landing-routes";

export default function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Defensive: config.matcher already filters, but guard anyway.
  if (!isLandingRoute(pathname)) {
    return NextResponse.next();
  }

  // Cookie-based redirect: if user chose EN previously and hits unprefixed URL, redirect to /en/*
  const cookieLocale = req.cookies.get("NEXT_LOCALE")?.value;
  const hasLocalePrefix = locales.some(
    (l) => pathname === `/${l}` || pathname.startsWith(`/${l}/`)
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

Behavior:
- Cold visitor, PT browser, `/` → PT. ✓
- Cold visitor, EN browser, `/` → PT (default). ✓ (fixes Bug 1)
- Returning visitor, cookie=en, `/` → 308 redirect to `/en`. ✓
- `/en/manifesto` → EN rendered (next-intl routing). ✓
- `/app/journal` → passes through (not matched). Layout cookie resolver handles.

### Unit 2 — LocaleSwitcher (two modes)

```ts
// components/layout/LocaleSwitcher.tsx
import { isLandingRoute } from "@/lib/i18n/landing-routes";

// Inside handleSwitch:
document.cookie = `NEXT_LOCALE=${next};path=/;max-age=31536000;samesite=lax`;

if (isLandingRoute(pathname)) {
  // URL-prefix mode: flip /en ↔ /
  const canonical = stripLocalePrefix(pathname);
  const normalized = canonical.startsWith("/") ? canonical : `/${canonical}`;
  const target = next === defaultLocale
    ? normalized || "/"
    : normalized === "/" ? "/en" : `/en${normalized}`;
  window.location.assign(`${target}${window.location.search}${window.location.hash}`);
} else {
  // Cookie-only mode: reload same URL. Server layout reads cookie.
  window.location.reload();
}
```

Behavior:
- Click EN on `/app/journal` → cookie set, reload → `app/app/layout` reads `en`, renders EN. ✓ (fixes Bug 2)
- Click EN on `/` → URL flips to `/en`. ✓
- Click PT on `/en/pricing` → URL flips to `/pricing`. ✓
- Query string + hash preserved on landing flip.

### Unit 3 — Root layout `<html lang>`

```tsx
// app/layout.tsx
import { cookies } from "next/headers";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const cookieLocale = cookies().get("NEXT_LOCALE")?.value;
  const htmlLang = cookieLocale === "en" ? "en" : "pt-BR";
  return (
    <html lang={htmlLang} suppressHydrationWarning>
      {/* ... */}
    </html>
  );
}
```

Correct `lang` attribute for SEO + screen readers.

### Unit 4 — Messages consolidation

Add authenticated namespaces to `messages/pt.json` + `messages/en.json`. Final top-level keys:

**Landing (existing):** `_meta, seo, hero, socialProof, bento, howItWorks, testimonials, faq, pricing, manifesto, features, blog, exitIntent, stickyCta, nav, smartAlerts`

**Authenticated (new/expanded):**
- `app.common` — shared actions: Save, Cancel, Loading, Back, Close, Confirm, Delete, Edit, Search
- `app.sidebar` — expanded from existing (already partial)
- `app.appHeader` — topbar, user menu, notifications
- `app.dashboard` — dashboard page + widgets
- `app.journal` — journal page + modals + empty states + table
- `app.macro` — macro intelligence (calendar, rates, headlines, sentiment)
- `app.dexter` — coach + analyst + chat
- `app.prop` — prop accounts + rules + payouts
- `app.reports` — export + filters
- `app.backtest` — backtest section
- `app.mentor` — mentor page
- `app.settings` — settings panels
- `app.subscription` — billing + pricing (authenticated)
- `app.onboarding` — onboarding steps
- `app.login` — login/signup/reset
- `app.academy` — academy
- `app.brand` — brand page
- `app.changelog` — changelog
- `app.riskDisclaimer` — disclaimer
- `app.errors` — 404, 500, bootstrap warning
- `app.a11y` — skip links, aria labels

Migration order: copy all keys from `lib/i18n/app.ts` PT dict → fix English-masquerading-as-PT values → add EN counterparts → then sweep hardcoded strings.

### Unit 5 — Parity script

```js
// scripts/i18n-check.mjs
import pt from "../messages/pt.json" assert { type: "json" };
import en from "../messages/en.json" assert { type: "json" };

function flatten(obj, prefix = "") {
  const out = [];
  for (const k in obj) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (obj[k] && typeof obj[k] === "object") out.push(...flatten(obj[k], key));
    else out.push(key);
  }
  return out;
}

const ptKeys = new Set(flatten(pt));
const enKeys = new Set(flatten(en));
const missingInEn = [...ptKeys].filter((k) => !enKeys.has(k));
const missingInPt = [...enKeys].filter((k) => !ptKeys.has(k));

if (missingInEn.length || missingInPt.length) {
  console.error("i18n parity check failed:");
  if (missingInEn.length) console.error("Missing in EN:", missingInEn);
  if (missingInPt.length) console.error("Missing in PT:", missingInPt);
  process.exit(1);
}
console.log(`i18n parity OK (${ptKeys.size} keys)`);
```

Add to `package.json`:
```json
"scripts": {
  "i18n:check": "node scripts/i18n-check.mjs",
  "build": "npm run i18n:check && next build"
}
```

### Unit 6 — Consumer migration

Components using `useAppT()` from `hooks/useAppLocale.ts`:
- `components/dashboard/BacktestSection.tsx`
- `components/dashboard/DayTimeline.tsx`
- `components/dashboard/SmartAlertsBanner.tsx`
- `components/dashboard/TodayMatters.tsx`
- `components/journal/AdaptiveImportModal.tsx`
- `components/journal/AddTradeModal.tsx`
- `components/journal/DayDetailModal.tsx`
- `components/journal/ImportPreview.tsx`
- `components/journal/JournalEmptyOnboarding.tsx`
- `components/journal/JournalTradesTable.tsx`
- `components/journal/NoteRow.tsx`
- `components/journal/PsychologySection.tsx`
- `components/journal/TagPicker.tsx`
- `components/journal/TradeDetailModal.tsx`
- `components/journal/TradeScreenshotUpload.tsx`
- `components/layout/AppHeader.tsx`
- `components/layout/AppSidebar.tsx`
- `components/macro/BreakingNewsFeed.tsx`
- `components/macro/EconomicCalendar.tsx`
- `components/macro/HeadlinesFeed.tsx`
- `components/macro/SentimentBar.tsx`
- `app/app/journal/page.tsx`
- `app/app/macro/page.tsx`

Replace pattern:
```ts
// Before
import { useAppT } from "@/hooks/useAppLocale";
const t = useAppT();
t("journal.title");

// After
import { useTranslations } from "next-intl";
const t = useTranslations("app.journal");
t("title");
```

After all 23 files migrated: delete `lib/i18n/app.ts` + `hooks/useAppLocale.ts`.

### Unit 7 — Hardcoded string sweep

Method:
1. Regex grep for PT diacritics in tsx/ts under `app/` + `components/`: `[áéíóúâêôãõç]|ção\b|ções\b`.
2. Regex grep for common PT words: `\b(Sair|Configurações|Carregando|Voltar|Salvar|Cancelar|Enviar|Adicionar|Editar|Excluir|Fechar|Confirmar|Procurar|Pesquisar|Entrar|Registrar|Esqueci|Senha|Nome|E-mail|Telefone)\b`.
3. For each match: extract to appropriate `app.*` namespace, replace with `t("key")`.
4. Re-run grep until clean (minus comments + data).

Pages with known hardcoded strings:
- `app/app/layout.tsx` — skip link
- `app/app/dashboard/page.tsx` — all widgets
- `app/app/journal/page.tsx` — headers, actions
- `app/app/macro/page.tsx` — tabs, titles
- `app/app/prop/page.tsx` — account cards
- `app/app/reports/page.tsx` — filters, export
- `app/app/settings/page.tsx` — tab labels, form labels
- `app/app/subscription/page.tsx` — billing strings
- `app/app/dexter/**` — chat UI, placeholders
- `app/app/backtest/**`
- `app/app/mentor/**`
- `app/app/account/**`
- `app/app/admin/**` (if user-facing)
- `app/app/news/**`
- `app/app/pricing/**`
- `app/app/chart/**`
- `app/login/**`
- `app/onboarding/**`
- `app/reset-password/**`
- `app/academy/**`
- `app/brand/**`
- `app/changelog/**`
- `app/risk-disclaimer/**`
- `app/not-found.tsx`, `app/error.tsx`
- `components/landing/Navbar.tsx` (user menu strings)
- `components/landing/Footer.tsx`
- `components/landing/*Modal*.tsx`
- `components/billing/**`
- `components/auth/**`
- `components/onboarding/**`

### Unit 8 — Error handling

`NextIntlClientProvider` config in both layouts:
```tsx
<NextIntlClientProvider
  locale={locale}
  messages={messages}
  onError={(err) => {
    if (err.code === "MISSING_MESSAGE") return; // swallow in prod, log in dev
    throw err;
  }}
  getMessageFallback={({ namespace, key }) => `${namespace}.${key}`}
>
```

Build-time parity check prevents shipping missing keys. Runtime fallback prevents UI crash if drift slips through.

---

## Data Flow

### Flow A — First-time visitor (PT browser)
```
GET / → middleware: cookie none, no prefix → intl middleware → pass through (defaultLocale=pt, localePrefix=as-needed) → render PT
```

### Flow B — First-time visitor (EN browser)
```
GET / → middleware: cookie none, localeDetection=false → render PT
(previously: would redirect to /en)
```

### Flow C — Returning EN user on landing
```
Cookie=en, GET / → middleware: cookieLocale=en, no prefix → 308 to /en → render EN
Cookie=en, GET /en/pricing → middleware: has prefix → intl middleware → render EN
```

### Flow D — User clicks EN on /app/journal
```
LocaleSwitcher: isLandingRoute=false → set cookie en → window.location.reload()
GET /app/journal (cookie=en) → middleware: path not matched → pass through
app/app/layout: reads cookie → locale=en → NextIntlClientProvider(messages.en) → EN render
```

### Flow E — User clicks PT on /en/manifesto
```
LocaleSwitcher: isLandingRoute=true → set cookie pt → target=/manifesto → location.assign
GET /manifesto → middleware: cookie=pt, no prefix → intl middleware → render PT
```

---

## Testing Strategy

### Automated (Playwright)
1. Cold visitor PT browser `/` → assert PT strings visible.
2. Cold visitor with `Accept-Language: en-US,en;q=0.9` `/` → assert PT strings (regression guard Bug 1).
3. Set cookie `NEXT_LOCALE=en`, `/` → assert redirect to `/en`.
4. Click EN toggle on `/app/journal` → assert no 404, page renders, strings in EN.
5. Reload `/app/journal` with cookie=en → assert EN persists.
6. Click PT toggle on `/en/pricing` → assert URL becomes `/pricing`, strings PT.
7. Build-time: `npm run i18n:check` exits 0.

### Manual sweep
After each milestone commit, visual scan each page in PT then EN. Screenshot diff.

### Sentry monitoring
Track `MISSING_MESSAGE` errors post-deploy for 48h. Zero tolerance.

---

## Out of Scope

- Date/number formatting localization (current `toLocaleString("pt-BR")` usage preserved).
- RTL language support.
- Moving `/app/**` into `/app/[locale]/**` URL structure.
- Backend-generated content translation (AI narratives remain Portuguese).
- Admin-only pages (`/app/admin/**`) — internal tool, PT only acceptable.
- Third-party embedded widgets (TradingView, Stripe checkout) — provider-locale-driven.

---

## Open Questions (resolved)

- Scope: **Maximum** (user selected option 3).
- Visual design of toggle: **unchanged** — existing pill component acceptable.
- Admin pages translation: excluded (internal).

---

## Acceptance Criteria

1. Shared link `owealthinvesting.com/` opens in PT regardless of visitor's browser language.
2. User clicks EN toggle on any `/app/**` page → page reloads in EN, no 404, no console error.
3. After clicking EN once, every subsequent page load (any route) shows EN until user toggles back.
4. Every visible string (buttons, labels, headers, tooltips, aria-labels, empty states, error messages) has PT + EN translations in `messages/*.json`.
5. `npm run i18n:check` passes; CI blocks merge on parity failure.
6. `lib/i18n/app.ts` + `hooks/useAppLocale.ts` deleted.
7. No remaining PT literals in `app/app/**` components (grep clean).
8. `<html lang>` matches active locale.
9. Sentry reports zero `MISSING_MESSAGE` errors 48h post-deploy.

---

## Implementation Phases (preview for writing-plans)

- **P1** — Middleware + LocaleSwitcher + html lang (Bug 1 + Bug 2 fixed in isolation).
- **P2** — Parity script + CI hook.
- **P3** — Messages consolidation: migrate `lib/i18n/app.ts` → `messages/*.json` under `app.*`.
- **P4** — Consumer migration: 23 files from `useAppT` → `useTranslations`.
- **P5** — Delete dead code (`lib/i18n/app.ts`, `useAppLocale.ts`).
- **P6** — Hardcoded sweep: `/app/app/**` pages.
- **P7** — Hardcoded sweep: `/app/app/**` components.
- **P8** — Hardcoded sweep: auth flow (`login`, `onboarding`, `reset-password`).
- **P9** — Hardcoded sweep: aux routes (`academy`, `brand`, `changelog`, `risk-disclaimer`, `not-found`, `error`).
- **P10** — Hardcoded sweep: landing components + subpages.
- **P11** — Playwright tests.
- **P12** — Visual QA (PT + EN) + Sentry monitoring setup.

Each phase ends with commit + deploy + smoke test. Full bilingual parity achieved at P12.
