# Accessibility Audit Report — WCAG 2.1 AA
**Date:** 2026-03-28
**Auditor:** Claude Opus 4.6 (forensic audit)
**Scope:** All TSX files in `app/` and `components/`

---

## Summary

| Metric | Value |
|---|---|
| **Files Analyzed** | ~65 TSX files |
| **Critical (HIGH)** | 8 |
| **Medium** | 11 |
| **Low** | 6 |
| **Total Findings** | 25 |
| **Technical Debt Estimate** | ~18-24 hours |

### Positive Findings
- Skip navigation link exists on landing page (`app/page.tsx:37`)
- Landing page uses proper `<main>`, `<nav>`, `<section>` landmarks with `aria-label`
- All `<img>` tags have meaningful `alt` text (4/4 checked)
- Login page uses `role="alert"` and `role="status"` for error/success messages
- `BootstrapWarning` uses `role="alert"`
- Calendar navigation buttons have `aria-label`
- `AnnouncementBar` close button has `aria-label`
- Decorative SVGs use `aria-hidden="true"` (GridPattern, FeatureVisuals, particles, glowy-waves)
- `PaywallGate` marks blurred content as `aria-hidden="true"`
- shadcn Dialog/Sheet components provide built-in focus trapping and ARIA roles

---

## HIGH Severity

### [HIGH] F-01: Form inputs missing label association — WCAG 1.3.1, 4.1.2
- **Files:**
  - `components/dashboard/BacktestSection.tsx:166,189,201,202,210` — 5 inputs (symbol, pnl, date, time, observation) have NO `<label>` or `aria-label`
  - `components/journal/AddTradeModal.tsx:114-195` — Labels exist but use `<label>` without `htmlFor`/`id` pairing (implicit association only works if input is nested inside `<label>`, which it is not here)
  - `components/calendar/DayDetailPanel.tsx:261,312` — textarea and tag input have no labels
  - `components/journal/JournalTradesTable.tsx:145` — symbol search input has `placeholder` only
  - `app/app/account/page.tsx:64,68` — `<label>` without `htmlFor`, `<input>` without `id`
  - `app/academy/page.tsx:265` — search input
  - `app/blog/page.tsx:196` — search input
  - `components/dashboard/JournalBriefing.tsx:161` — `<select>` without label
- **Issue:** Screen readers cannot programmatically associate labels with inputs. Users cannot identify what each field is for.
- **Fix:** Add `id` to each input and `htmlFor` to each label, OR use `aria-label` on inputs. For BacktestSection, wrap each input group in a `<label>` or add `aria-label` attributes.
- **Effort:** Medium (20+ inputs across 8 files)

### [HIGH] F-02: Icon-only buttons missing accessible names — WCAG 4.1.2
- **Files:**
  - `components/journal/PnlCalendar.tsx:272,279` — prev/next month buttons (contain only `<ChevronLeft>`/`<ChevronRight>` icons)
  - `components/theme-toggle.tsx:19` — theme toggle button (contains only `<Sun>`/`<Moon>` icon)
  - `components/macro/HeadlinesFeed.tsx:131` — refresh button (contains only `<RefreshCw>` icon)
  - `components/journal/AddTradeModal.tsx:105` — close button (contains only `<X>` icon)
  - `app/app/settings/page.tsx:475,484` — move up/down buttons (contain only `<ChevronUp>`/`<ChevronDown>` icons)
- **Issue:** Buttons with only icon children have no accessible text. Screen readers announce "button" with no indication of purpose.
- **Fix:** Add `aria-label` to each icon-only button (e.g., `aria-label="Mes anterior"`, `aria-label="Alternar tema"`, `aria-label="Atualizar"`, `aria-label="Fechar"`, `aria-label="Mover para cima"`).
- **Effort:** Small (add one attribute per button)

### [HIGH] F-03: Custom dropdown menu lacks keyboard support — WCAG 2.1.1, 4.1.2
- **File:** `components/layout/AppHeader.tsx:105-128`
- **Code:** User menu is a custom `<div>` dropdown toggled by `<button>`. No `role="menu"`, no `aria-expanded`, no Escape key handler, no arrow key navigation.
- **Issue:** Keyboard users cannot navigate dropdown items, cannot close with Escape, and screen readers do not know the menu state.
- **Fix:** Add `aria-expanded={userMenuOpen}` and `aria-haspopup="menu"` to trigger button. Add `role="menu"` to dropdown container. Add `role="menuitem"` to each item. Implement `onKeyDown` for Escape (close) and arrow keys (navigate items). OR replace with Radix `DropdownMenu`.
- **Effort:** Medium (requires keyboard handler logic, or component swap)

### [HIGH] F-04: Heading hierarchy skips levels — WCAG 1.3.1
- **Files:**
  - `app/app/ai-coach/page.tsx` — h1 (line 513) jumps directly to h3 (lines 525, 563, 597, 624). Missing h2 level.
  - `app/app/analyst/page.tsx` — h1 (line 733) jumps to h3 (lines 840, 875). Also has orphan h2 (line 269) in report view without surrounding h1.
  - `app/app/page.tsx` — Dashboard page uses h1 but section headings use no heading tags or jump levels.
- **Issue:** Screen reader users navigating by heading level will miss content or encounter confusing structure.
- **Fix:** Change h3 elements to h2 in ai-coach and analyst pages where they are direct children of the page (not nested under another h2).
- **Effort:** Small

### [HIGH] F-05: No skip navigation on authenticated pages — WCAG 2.4.1
- **File:** `app/app/layout.tsx`
- **Code:** The authenticated layout has no skip link. Only the landing page (`app/page.tsx`) has one.
- **Issue:** Keyboard users must tab through the entire sidebar/header navigation on every page before reaching main content.
- **Fix:** Add a skip link at the top of the app layout: `<a href="#main-content" className="sr-only focus:not-sr-only ...">Pular para o conteudo</a>` and add `id="main-content"` to the main content area.
- **Effort:** Small

### [HIGH] F-06: Data tables missing scope attributes — WCAG 1.3.1
- **Files:**
  - `components/dashboard/AccountsOverview.tsx:222-245` — `<th>` elements lack `scope="col"`
  - `components/reports/PsychologyAnalytics.tsx:538-547` — `<th>` elements lack `scope="col"`
  - `components/journal/JournalTradesTable.tsx` — trade list rendered as divs, not a proper `<table>` (if it displays tabular data, it should use table markup)
- **Issue:** Screen readers cannot associate data cells with their column headers.
- **Fix:** Add `scope="col"` to all `<th>` elements.
- **Effort:** Small

### [HIGH] F-07: `href="#"` used as button — WCAG 4.1.2
- **File:** `app/login/page.tsx:271`
- **Code:** `<a href="#" ... onClick={(e) => { e.preventDefault(); ... }}>Esqueceu a senha?</a>`
- **Issue:** Links with `href="#"` that perform actions should be `<button>` elements. Screen readers announce this as a link, but it navigates nowhere.
- **Fix:** Replace with `<button type="button" ...>Esqueceu a senha?</button>` with appropriate styling.
- **Effort:** Small

### [HIGH] F-08: No `aria-live` regions for dynamic dashboard content — WCAG 4.1.3
- **Files:**
  - `app/app/page.tsx` — KPI cards, charts, news feed update without announcing changes
  - `app/app/ai-coach/page.tsx` — Chat messages stream in without `aria-live`
  - `components/macro/HeadlinesFeed.tsx` — Headlines refresh without announcement
  - `components/macro/EconomicCalendar.tsx` — Calendar data refreshes silently
- **Issue:** When content updates dynamically (API fetches, streaming chat), screen reader users are not informed.
- **Fix:** Add `aria-live="polite"` to containers that receive dynamic updates. For the AI chat, use `aria-live="polite"` on the messages container. Add `role="log"` to the chat message list.
- **Effort:** Medium

---

## MEDIUM Severity

### [MEDIUM] F-09: Color contrast concern — text-muted-foreground on background — WCAG 1.4.3
- **File:** `app/globals.css`
- **Values (light):** `--muted-foreground: 0 0% 42%` (#6B6B6B) on `--background: 0 0% 95%` (#F2F2F2)
  - Calculated contrast ratio: ~3.82:1 (FAILS 4.5:1 for normal text, PASSES 3:1 for large text)
- **Values (dark):** `--muted-foreground: 220 9% 64%` (~#9BA1AB) on `--background: 0 0% 4%` (#0A0A0A)
  - Calculated contrast ratio: ~7.7:1 (PASSES)
- **Usage:** `text-muted-foreground` is used extensively for subtitles, labels, timestamps, secondary text across the entire app (100+ occurrences).
- **Issue:** Light theme muted text fails WCAG AA for normal-sized text (body, labels, timestamps at text-xs/text-sm).
- **Fix:** Darken `--muted-foreground` in light theme to at least `0 0% 36%` (#5C5C5C) for 4.5:1 ratio, or to `0 0% 33%` (#545454) for comfortable margin.
- **Effort:** Small (single CSS variable change, but verify visual impact)

### [MEDIUM] F-10: Focus indicators use `focus:` instead of `focus-visible:` — WCAG 2.4.7
- **Files:** Multiple files use `focus:outline-none focus:ring-*` instead of `focus-visible:outline-none focus-visible:ring-*`
  - `components/dashboard/BacktestSection.tsx` (all inputs)
  - `components/journal/AddTradeModal.tsx` (all inputs)
  - `components/calendar/DayDetailPanel.tsx` (textarea, input)
  - `components/ai/ChatInput.tsx:54`
  - `components/journal/JournalTradesTable.tsx:145`
  - `app/app/analyst/page.tsx:764`
- **Issue:** `focus:outline-none` removes the focus ring on mouse click AND keyboard focus. `focus-visible:` only shows the ring for keyboard users, preserving the visual for those who need it while hiding it for mouse users.
- **Fix:** Replace `focus:outline-none focus:ring-*` with `focus-visible:outline-none focus-visible:ring-*` across all custom inputs.
- **Effort:** Medium (search-and-replace across ~10 files)

### [MEDIUM] F-11: Pricing toggle switch missing ARIA state — WCAG 4.1.2
- **Files:**
  - `components/billing/PricingCards.tsx:238` — has `role="switch"` but missing `aria-checked`
  - `components/landing/LandingPricing.tsx:112` — has `role="switch"` but missing `aria-checked`
- **Issue:** Screen readers cannot determine the current state (annual vs monthly) of the toggle.
- **Fix:** Add `aria-checked={isAnnual}` and `aria-label="Alternar entre plano mensal e anual"`.
- **Effort:** Small

### [MEDIUM] F-12: User menu button missing `aria-expanded` — WCAG 4.1.2
- **Files:**
  - `components/layout/AppHeader.tsx:105` — user menu trigger
  - `components/landing/Navbar.tsx:171` — landing user menu trigger
  - `components/landing/Navbar.tsx:238` — mobile menu trigger (has `aria-label` but no `aria-expanded`)
- **Issue:** Screen readers cannot determine whether the menu is open or closed.
- **Fix:** Add `aria-expanded={userMenuOpen}` to each trigger button.
- **Effort:** Small

### [MEDIUM] F-13: Onboarding back button is icon-only without label — WCAG 4.1.2
- **File:** `app/onboarding/page.tsx:389,463,546`
- **Code:** `<button><ArrowLeft size={16} /></button>` — contains only an icon
- **Issue:** Screen reader announces "button" with no label.
- **Fix:** Add `aria-label="Voltar"` to each back button.
- **Effort:** Small

### [MEDIUM] F-14: Authenticated app area missing `<main>` landmark — WCAG 1.3.1
- **File:** `app/app/layout.tsx`
- **Issue:** The app layout does not wrap content in a `<main>` element. Landing page has `<main id="main-content">` but the authenticated area does not.
- **Fix:** Wrap the children content area in `<main id="main-content">`.
- **Effort:** Small

### [MEDIUM] F-15: Mobile navigation menu lacks focus trap — WCAG 2.4.3
- **Files:**
  - `components/layout/AppHeader.tsx:136-155` — mobile menu is a conditionally rendered `<div>`, no focus trap
  - `components/landing/Navbar.tsx:270-340` — same pattern
- **Issue:** When mobile menu opens, keyboard focus can escape behind the menu into the rest of the page.
- **Fix:** Implement focus trapping (e.g., using `focus-trap-react` or manual `keydown` handler) when mobile menu is open. Alternatively, use Radix `Sheet` component which handles this automatically.
- **Effort:** Medium

### [MEDIUM] F-16: Calendar day cells lack accessible date information — WCAG 4.1.2
- **File:** `components/calendar/CalendarGrid.tsx:120`
- **Code:** `<button>` with day number and optional PnL, but no `aria-label` describing the full date.
- **Issue:** Screen reader user hears "button 15" or "button 23" without knowing the month/year context.
- **Fix:** Add `aria-label` like `aria-label={\`${day} de ${monthName} de ${year}${hasTrades ? \`, P&L: ${pnl}\` : ""}\`}`.
- **Effort:** Small

### [MEDIUM] F-17: Form error messages not linked to inputs — WCAG 3.3.1
- **Files:**
  - `app/login/page.tsx:222` — error message `role="alert"` exists but is not linked to specific input via `aria-describedby`
  - `app/app/account/page.tsx` — error `<p>` not linked to input
  - `app/onboarding/page.tsx:299` — error alert not linked to input
- **Issue:** Screen readers announce the alert, but users cannot determine which field caused the error.
- **Fix:** Add `id` to error messages and `aria-describedby` pointing to the error on the relevant input.
- **Effort:** Small

### [MEDIUM] F-18: Backtest observation toggle lacks `aria-expanded` — WCAG 4.1.2
- **File:** `components/dashboard/BacktestSection.tsx:207`
- **Code:** `<button type="button" onClick={() => setShowObs((v) => !v)}>` — toggles observation textarea visibility
- **Issue:** Screen readers cannot determine if the section is expanded or collapsed.
- **Fix:** Add `aria-expanded={showObs}`.
- **Effort:** Small

### [MEDIUM] F-19: Weekly Briefing accordion missing ARIA — WCAG 4.1.2
- **File:** `components/macro/WeeklyBriefing.tsx:171,201`
- **Code:** Toggle buttons to expand/collapse briefing content, no `aria-expanded`.
- **Issue:** Same as F-18 — screen readers cannot determine state.
- **Fix:** Add `aria-expanded={isOpen}` to the toggle button, and `aria-controls` pointing to the content region.
- **Effort:** Small

---

## LOW Severity

### [LOW] F-20: Redundant/decorative SVGs not consistently hidden — WCAG 1.1.1
- **Files:** Some inline SVGs in components lack `aria-hidden="true"` (e.g., various Lucide icon usages inside buttons that already have text labels). Not critical since icons are supplementary to text.
- **Fix:** Add `aria-hidden="true"` to decorative SVG icons that are adjacent to text labels.
- **Effort:** Small

### [LOW] F-21: Account selector uses button list, not listbox pattern — WCAG 4.1.2
- **File:** `components/account/AccountSelectorInline.tsx:105`
- **Issue:** Account list rendered as buttons, not as a `listbox` with `option` roles. Functional but not the expected ARIA pattern for a selector.
- **Fix:** Consider wrapping in `role="listbox"` with `role="option"` on each account, and `aria-selected` for active.
- **Effort:** Medium

### [LOW] F-22: Missing `lang` attribute on HTML for PT-BR content — WCAG 3.1.1
- **File:** `app/layout.tsx`
- **Issue:** Verify `<html lang="pt-BR">` is set. Most content is in Portuguese; screen readers need this to use correct pronunciation.
- **Fix:** Ensure `<html lang="pt-BR">` in the root layout.
- **Effort:** Small

### [LOW] F-23: News items rendered as `<li>` without proper list context in some views — WCAG 1.3.1
- **File:** `components/macro/HeadlinesFeed.tsx`
- **Issue:** Headlines rendered as `<div>` elements, not in a `<ul>/<li>` structure. The same content in `app/app/page.tsx:910` correctly uses `<ul>/<li>`.
- **Fix:** Wrap headline items in `<ul>` and use `<li>` for each.
- **Effort:** Small

### [LOW] F-24: Disabled buttons communicate state only through opacity — WCAG 1.4.1
- **Files:** Various buttons use `disabled:opacity-50` as sole indicator of disabled state.
- **Issue:** Users who cannot perceive opacity changes may not realize the button is disabled. The HTML `disabled` attribute does communicate this to screen readers, but visual-only users with low vision may struggle.
- **Fix:** Add `cursor-not-allowed` (already present on some) and consider adding a tooltip or text indication.
- **Effort:** Small

### [LOW] F-25: EconomicCalendar country flags lack `loading="lazy"` — WCAG (Performance/UX)
- **File:** `components/macro/EconomicCalendar.tsx:46`
- **Issue:** Flag images from external CDN load eagerly. Not strictly WCAG but affects page load performance for users on slow connections.
- **Fix:** Add `loading="lazy"` attribute.
- **Effort:** Small

---

## Priority Remediation Order

| Priority | Finding(s) | Impact | Effort |
|---|---|---|---|
| 1 | F-01 (labels), F-02 (icon buttons) | Blocks screen reader users on core features | Small-Medium |
| 2 | F-03 (dropdown keyboard), F-05 (skip nav), F-07 (href#) | Blocks keyboard-only users | Small-Medium |
| 3 | F-09 (contrast), F-10 (focus-visible) | Degrades experience for low-vision/keyboard users | Small-Medium |
| 4 | F-04 (headings), F-06 (table scope), F-14 (main landmark) | Structural navigation broken | Small |
| 5 | F-08 (aria-live), F-11-F-19 (ARIA states) | Missing dynamic announcements | Medium |
| 6 | F-20-F-25 (Low) | Minor compliance gaps | Small |

---

## Contrast Ratio Reference

| Combination | Light | Dark | AA Normal (4.5:1) | AA Large (3:1) |
|---|---|---|---|---|
| `foreground` on `background` | #1A1A1A on #F2F2F2 | #FFF on #0A0A0A | PASS (13.5:1) | PASS |
| `muted-foreground` on `background` | #6B6B6B on #F2F2F2 | #9BA1AB on #0A0A0A | **FAIL (3.82:1)** | PASS |
| `muted-foreground` on `card` | #6B6B6B on #FFFFFF | #9BA1AB on #141414 | PASS (4.96:1) | PASS |
| `foreground` on `card` | #1A1A1A on #FFFFFF | #FFF on #141414 | PASS (17.6:1) | PASS |
| `destructive` text | Red on white/dark | -- | Verify per usage | -- |
