# Public Pages Forensic Audit — 2026-03-28

Auditor: Code Quality Analyzer (Opus 4.6)
Scope: All 10 public pages + root layout

---

## Page 1: Landing — `/`
**File:** `app/page.tsx`

| Check | Status | Notes |
|-------|--------|-------|
| Loading state | PASS | Server component, no async data fetching on page itself |
| Empty state | N/A | Static content |
| Error state | N/A | No runtime data fetching |
| SEO metadata | PASS | Inherits root layout metadata (title + OG tags) |
| Dark mode | PASS | Uses landing-specific CSS variables (l-text, l-bg, etc.) |
| bg-card bug | N/A | No bg-card usage |
| Performance | WARN | 14 component imports on single page; all render at once. Consider lazy-loading below-fold sections |
| Accessibility | PASS | Skip-to-content link present (line 35-39), semantic `<main>` with id, `<nav>` via Navbar |
| Security | PASS | No user input |
| Mobile | PASS | Responsive via child components |

### Issues Found:
- [LOW] Performance: All 14 landing sections import eagerly. Below-fold sections (Testimonial, EnterpriseTrust, LandingPricing) could benefit from dynamic imports or intersection-based loading.

---

## Page 2: Login — `/login`
**File:** `app/login/page.tsx`

| Check | Status | Notes |
|-------|--------|-------|
| Loading state | PASS | `loading` state with button text changes ("Acessando...", "Criando conta...", "Enviando e-mail...") and `disabled` on buttons |
| Empty state | N/A | Form page |
| Error state | PASS | Error state with `role="alert"` (line 222), info state with `role="status"` (line 229) |
| SEO metadata | FAIL | No page-level metadata export. Inherits generic root title only |
| Dark mode | FAIL | Entire page uses hardcoded colors: `bg-[#F7F6F3]`, `text-[#1A1A1A]`, `text-[#6B6B6B]`, `bg-white`, `border-[#D4D2CB]` throughout. Will NOT adapt to dark mode |
| bg-card bug | N/A | Does not use bg-card class |
| Performance | PASS | Lightweight, only Framer Motion + Supabase client |
| Accessibility | WARN | All form inputs have labels with `htmlFor` (good). Missing: no `<h1>` visible to screen readers on desktop (h1 is inside left panel, h2 is mobile-only). Tab order is logical |
| Security | WARN | `callbackError` from URL params is read but never displayed (line 46-48) — dead code. Uses `router.replace()` at line 53 (KNOWN VIOLATION per CLAUDE.md: should use `window.location.href`) |
| Mobile | PASS | Responsive flex layout, mobile nav with BrandMark, adequate touch targets on buttons |

### Issues Found:
- [HIGH] Dark mode completely broken — all colors are hardcoded hex values. No CSS variables used.
- [MEDIUM] Uses `router.replace()` (line 53) instead of `window.location.href` — KNOWN auth flow violation.
- [MEDIUM] No page-specific SEO metadata (title: "Entrar | wealth.Investing").
- [LOW] `callbackError` is read from URL params (line 46-48) but never rendered to the user. Dead code or missing feature.
- [LOW] "Esqueceu a senha?" link (line 271) uses `href="#"` with `onClick` — should be a `<button>` for accessibility.
- [LOW] Fade-out overlay (line 129-135) uses hardcoded `bg-[#F7F6F3]` — will flash white in dark mode transition.

---

## Page 3: Auth Callback — `/auth/callback`
**File:** `app/auth/callback/page.tsx`

| Check | Status | Notes |
|-------|--------|-------|
| Loading state | PASS | Shows "Autenticando..." text while processing |
| Empty state | N/A | Transient page |
| Error state | PASS | Catches all errors and redirects to `/login?error=callback` (line 54) |
| SEO metadata | PASS | N/A for transient auth page (inherits root, acceptable) |
| Dark mode | PASS | Uses `text-muted-foreground` (CSS variable) |
| bg-card bug | N/A | No bg-card |
| Performance | PASS | Minimal component, fast redirect |
| Accessibility | WARN | Loading indicator is just text, no aria-live region for screen readers |
| Security | PASS | Open redirect protection at line 45: `next.startsWith("/") && !next.startsWith("//")`. Uses `window.location.href` (correct per CLAUDE.md). Uses `.maybeSingle()` (line 42, correct) |
| Mobile | PASS | Centered flex layout |

### Issues Found:
- [LOW] Loading text "Autenticando..." has no `aria-live="polite"` or spinner, screen reader users get no feedback.
- [LOW] 500ms arbitrary `setTimeout` fallback (line 29) — fragile timing assumption for hash fragment processing.
- [INFO] `type: type as any` cast at line 25 — minor TypeScript hygiene issue.

---

## Page 4: Onboarding — `/onboarding`
**File:** `app/onboarding/page.tsx`

| Check | Status | Notes |
|-------|--------|-------|
| Loading state | PASS | `checking` state with "Carregando..." (line 223-230), `loading` state for save, `importState` for import flow |
| Empty state | N/A | Form wizard |
| Error state | PASS | Error display with `role="alert"` (line 299), import error state (line 507-510) |
| SEO metadata | FAIL | No page-level metadata export |
| Dark mode | PASS | Uses semantic classes: `text-foreground`, `text-muted-foreground`, `bg-card`, `border-border` |
| bg-card bug | PASS | Line 259: `bg-card` WITH inline `style={{ backgroundColor: "hsl(var(--card))" }}` — correctly handled |
| Performance | PASS | Reasonable imports, step-based rendering |
| Accessibility | WARN | Step 1 form has autoFocus (good). Steps 2-3 use buttons with clear labels. Missing: progress bar has no `role="progressbar"` or `aria-valuenow` |
| Security | PASS | Uses `window.location.href` for redirects (correct). Auth check on mount. Bearer token for API calls. Input length validation (MIN_LENGTH, MAX_LENGTH) |
| Mobile | PASS | `max-w-[400px]` centered, responsive grid on step 2 |

### Issues Found:
- [MEDIUM] No page-specific SEO metadata.
- [LOW] Progress bar (line 269-277) lacks `role="progressbar"`, `aria-valuenow`, `aria-valuemin`, `aria-valuemax` attributes.
- [LOW] Step 2 trader profile selection and Step 3 firm selection data is collected but never sent to the backend — appears to be UI-only data that is discarded.
- [LOW] `router` is in the useEffect dependency array (line 95) but is never used inside the effect.

---

## Page 5: Academy — `/academy`
**File:** `app/academy/page.tsx`

| Check | Status | Notes |
|-------|--------|-------|
| Loading state | N/A | Static content |
| Empty state | N/A | Static content |
| Error state | N/A | No data fetching |
| SEO metadata | FAIL | No metadata export. "use client" prevents static metadata — would need a separate `metadata` export or layout-level metadata |
| Dark mode | PASS | Uses landing CSS variables via inline styles and `l-text`, `l-text-secondary` classes. Dark variants on gradients |
| bg-card bug | N/A | Uses `landing-card` class instead |
| Performance | PASS | Lightweight, static data |
| Accessibility | PASS | Proper heading hierarchy (h1 > h2), course cards have descriptive text |
| Security | PASS | No user input. Email input is `disabled` |
| Mobile | PASS | Responsive grid `md:grid-cols-2`, readable text sizes |

### Issues Found:
- [MEDIUM] No page-specific SEO metadata (needs title: "Academy | wealth.Investing", description).
- [LOW] "use client" directive prevents Next.js static metadata export. This page has no client-side interactivity that requires it (AnimatedSection likely uses Framer Motion). Consider making it a server component with client-only animation wrappers.
- [LOW] CTA email input and button are disabled with no explanation other than "Em breve" badge at top.

---

## Page 6: Blog — `/blog`
**File:** `app/blog/page.tsx`

| Check | Status | Notes |
|-------|--------|-------|
| Loading state | N/A | Static content |
| Empty state | N/A | Static mock data |
| Error state | N/A | No data fetching |
| SEO metadata | FAIL | No metadata export. Same "use client" issue as Academy |
| Dark mode | PASS | Uses landing CSS variables, dark gradient variants |
| bg-card bug | N/A | Uses `landing-card` class |
| Performance | PASS | Static, lightweight |
| Accessibility | PASS | Heading hierarchy correct, semantic structure |
| Security | PASS | No user input. Disabled email input |
| Mobile | PASS | Responsive grid `md:grid-cols-2` |

### Issues Found:
- [MEDIUM] No page-specific SEO metadata.
- [LOW] Blog posts are hardcoded mock data with no links — purely decorative. "Em breve" badges are clear.
- [LOW] Same "use client" issue — could be server component.

---

## Page 7: Changelog — `/changelog`
**File:** `app/changelog/page.tsx`

| Check | Status | Notes |
|-------|--------|-------|
| Loading state | N/A | Static content |
| Empty state | N/A | Static data |
| Error state | N/A | No data fetching |
| SEO metadata | FAIL | No metadata export |
| Dark mode | PASS | Landing CSS variables throughout |
| bg-card bug | N/A | Uses `landing-card` |
| Performance | PASS | Static, lightweight |
| Accessibility | PASS | Timeline with heading hierarchy h1 > h3, semantic list structure |
| Security | PASS | No user input |
| Mobile | PASS | Timeline adapts (dots hidden on mobile via `hidden md:flex`), responsive spacing |

### Issues Found:
- [MEDIUM] No page-specific SEO metadata.
- [LOW] "use client" unnecessary if AnimatedSection is the only client need.
- [LOW] Timeline vertical line uses `hidden md:block` but dots use `hidden md:flex` — consistent behavior, acceptable.

---

## Page 8: Manifesto — `/manifesto`
**File:** `app/manifesto/page.tsx`

| Check | Status | Notes |
|-------|--------|-------|
| Loading state | N/A | Static content |
| Empty state | N/A | Static content |
| Error state | N/A | No data fetching |
| SEO metadata | FAIL | No metadata export |
| Dark mode | WARN | Hero section uses hardcoded dark gradient background (`hsl(220 40% 8%)`, white text) which works well in both modes. However, the bottom fade (line 209-214) uses `hsl(var(--landing-bg))` which correctly adapts. Mixed approach but functional |
| bg-card bug | N/A | Uses landing-card |
| Performance | WARN | Hero has 3 large blur elements (500px, 400px orbs with blur-[120px] and blur-[100px]) — expensive CSS filters on mobile GPUs |
| Accessibility | PASS | Semantic sections with IDs for scroll targeting, proper heading hierarchy, button for scroll action |
| Security | PASS | No user input |
| Mobile | PASS | Responsive typography scaling, grid adapts |

### Issues Found:
- [MEDIUM] No page-specific SEO metadata.
- [LOW] `ctaRef` (line 116) is declared but never used for anything meaningful — dead code.
- [LOW] Large CSS blur effects on hero orbs may cause jank on low-end mobile devices.
- [LOW] Manifesto cover image `/manifesto-cover.png` (line 369) — no width/height attributes, potential CLS. Should use `next/image` for optimization.
- [LOW] `useRef` import (line 3) — "use client" required only for this unused ref. Could be server component otherwise.

---

## Page 9: Risk Disclaimer — `/risk-disclaimer`
**File:** `app/risk-disclaimer/page.tsx`

| Check | Status | Notes |
|-------|--------|-------|
| Loading state | N/A | Static content |
| Empty state | N/A | Static content |
| Error state | N/A | No data fetching |
| SEO metadata | FAIL | No metadata export |
| Dark mode | PASS | Uses `text-foreground`, `text-muted-foreground` — CSS variables |
| bg-card bug | N/A | No bg-card |
| Performance | PASS | Minimal, server component |
| Accessibility | PASS | Proper h1, semantic structure, link via Button component |
| Security | PASS | No user input |
| Mobile | PASS | `max-w-2xl px-6` with adequate padding |

### Issues Found:
- [MEDIUM] No page-specific SEO metadata (important for a legal page).
- [LOW] Very sparse content — single paragraph. Consider expanding for legal completeness.
- [LOW] "Continuar" button links to `/login` — may confuse users who arrived from other paths. Consider using `back` navigation or linking to `/`.

---

## Page 10: Feature Pages — `/features/[slug]`
**File:** `app/features/[slug]/page.tsx`

| Check | Status | Notes |
|-------|--------|-------|
| Loading state | N/A | Static generation via `generateStaticParams` |
| Empty state | N/A | Static content per slug |
| Error state | PASS | Invalid slugs trigger `notFound()` (lines 55-56, 58-59) — proper 404 handling |
| SEO metadata | PASS | `generateMetadata` provides per-slug title and description (lines 25-46) |
| Dark mode | PASS | Delegated to `FeaturePageClient` component |
| bg-card bug | PASS | Delegated to `FeaturePageClient` |
| Performance | PASS | SSG with `generateStaticParams`, optimal for static feature pages |
| Accessibility | PASS | Delegated to FeaturePageClient |
| Security | PASS | Slug validated against known SLUG_MAP keys, invalid slugs return 404 |
| Mobile | PASS | Delegated to FeaturePageClient |

### Issues Found:
- [INFO] Only page with proper dynamic metadata — well implemented.
- [LOW] `generateMetadata` has a fallback title "Feature -- wealth.Investing" (line 31) that should never be reached due to `notFound()` in the page function, but the metadata function does not call `notFound()` itself — it silently returns a generic title. This is a minor inconsistency.

---

## Root Layout — `app/layout.tsx`
**File:** `app/layout.tsx`

| Check | Status | Notes |
|-------|--------|-------|
| SEO metadata | WARN | Has title, description, and basic OG tags. Missing: `twitter` card metadata, OG image URL, canonical URL, viewport meta |
| Dark mode | PASS | Theme flash prevention script in `<head>` (lines 53-66), ThemeProvider wraps app |
| Performance | WARN | 4 Google Fonts loaded (Inter, JetBrains Mono, Plus Jakarta Sans, Manrope) — each adds a network request. BGPattern dot grid on every page with `opacity-70` and mask-image |
| Accessibility | PASS | `lang="pt-BR"` set, `font-display: swap` on all fonts |
| Security | PASS | No inline script vulnerabilities (theme script is safe, read-only localStorage) |

### Issues Found:
- [MEDIUM] Missing OG image URL — social shares will have no preview image.
- [MEDIUM] Missing `twitter:card` metadata for Twitter/X shares.
- [LOW] 4 Google Fonts may impact LCP. Consider if all 4 are needed (Manrope usage should be verified).
- [LOW] No canonical URL or sitemap reference in metadata.
- [LOW] `suppressHydrationWarning` on `<html>` — necessary for theme but worth documenting.

---

## Summary

### Overall Quality Score: 6.5/10
### Files Analyzed: 11
### Issues Found: 34
### Technical Debt Estimate: 8-12 hours

### Critical Issues (0)
None found.

### High Severity (1)
1. **Login page dark mode completely broken** — All colors are hardcoded hex values (`#F7F6F3`, `#1A1A1A`, `#6B6B6B`, `#D4D2CB`, `white`). The entire login experience is light-only. This is the second most important public page.
   - File: `app/login/page.tsx` (throughout, 50+ hardcoded color instances)

### Medium Severity (9)
1. **Missing SEO metadata on 7 pages**: login, onboarding, academy, blog, changelog, manifesto, risk-disclaimer. Only features/[slug] and root layout have proper metadata.
2. **Login uses `router.replace()`** (line 53) instead of `window.location.href` — known auth flow violation.
3. **Missing OG image** in root layout — all social shares lack preview images.
4. **Missing Twitter card metadata** in root layout.

### Low Severity (20+)
- Login: dead `callbackError` code, `href="#"` on forgot password link, hardcoded fade overlay
- Auth callback: no aria-live, arbitrary 500ms timeout, `as any` cast
- Onboarding: no progressbar ARIA, unused router dep, step 2/3 data discarded
- Academy/Blog/Changelog: "use client" unnecessary, could be server components
- Manifesto: unused ctaRef, expensive blur effects, `<img>` instead of `next/image`, potential CLS
- Risk disclaimer: sparse content, confusing "Continuar" link destination
- Landing: eager loading of all 14 sections
- Layout: 4 Google Fonts, no canonical URL

### Positive Findings
- Auth callback has proper open redirect protection
- Onboarding correctly uses `bg-card` with inline style workaround
- Features/[slug] is the gold standard: SSG, dynamic metadata, proper 404 handling
- Skip-to-content link on landing page
- All forms have proper labels with `htmlFor`
- Error states use `role="alert"` for accessibility
- Theme flash prevention script in root layout
- `window.location.href` used correctly in auth callback and onboarding (but not login)

### Priority Fix Order
1. Login page dark mode (HIGH — user-facing, brand-damaging)
2. Add metadata to all 7 pages missing it (MEDIUM — SEO impact)
3. Fix `router.replace()` in login (MEDIUM — auth stability)
4. Add OG image to root layout (MEDIUM — social sharing)
5. Convert static pages from "use client" to server components (LOW — performance)
